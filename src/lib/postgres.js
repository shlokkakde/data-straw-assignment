import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

let sqlClient = null;
let schemaPromise = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || "";
}

export function getSql() {
  if (!sqlClient) {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required. Add Neon Postgres from Vercel Marketplace or set a hosted Postgres connection string."
      );
    }
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema();
  }
  return schemaPromise;
}

async function createSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      external_id TEXT UNIQUE,
      fingerprint TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      link TEXT UNIQUE,
      description TEXT,
      content TEXT,
      image_url TEXT,
      source_id TEXT,
      source_name TEXT,
      source_url TEXT,
      language TEXT,
      published_at TEXT,
      countries JSONB NOT NULL DEFAULT '[]'::jsonb,
      categories JSONB NOT NULL DEFAULT '[]'::jsonb,
      keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
      creators JSONB NOT NULL DEFAULT '[]'::jsonb,
      raw_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS article_insights (
      article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
      sentiment_score DOUBLE PRECISION NOT NULL DEFAULT 0,
      insights JSONB NOT NULL DEFAULT '[]'::jsonb,
      model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      query TEXT,
      fetched_count INTEGER NOT NULL DEFAULT 0,
      stored_count INTEGER NOT NULL DEFAULT 0,
      analyzed_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_article_insights_sentiment ON article_insights(sentiment)`;
}

function asJson(value) {
  return JSON.stringify(value ?? []);
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function dateString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function upsertArticle(article) {
  await ensureSchema();
  const sql = getSql();
  const existing = await sql`
    SELECT id
    FROM articles
    WHERE (${article.externalId}::text IS NOT NULL AND external_id = ${article.externalId})
       OR fingerprint = ${article.fingerprint}
       OR (${article.link}::text IS NOT NULL AND link = ${article.link})
    LIMIT 1
  `;

  if (existing.length) {
    const id = existing[0].id;
    await sql`
      UPDATE articles SET
        external_id = ${article.externalId},
        fingerprint = ${article.fingerprint},
        title = ${article.title},
        link = ${article.link},
        description = ${article.description},
        content = ${article.content},
        image_url = ${article.imageUrl},
        source_id = ${article.sourceId},
        source_name = ${article.sourceName},
        source_url = ${article.sourceUrl},
        language = ${article.language},
        published_at = ${article.publishedAt},
        countries = ${asJson(article.countries)}::jsonb,
        categories = ${asJson(article.categories)}::jsonb,
        keywords = ${asJson(article.keywords)}::jsonb,
        creators = ${asJson(article.creators)}::jsonb,
        raw_json = ${JSON.stringify(article.rawJson)}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return { id, inserted: false };
  }

  await sql`
    INSERT INTO articles (
      id, external_id, fingerprint, title, link, description, content, image_url,
      source_id, source_name, source_url, language, published_at, countries,
      categories, keywords, creators, raw_json
    ) VALUES (
      ${article.id}, ${article.externalId}, ${article.fingerprint}, ${article.title}, ${article.link},
      ${article.description}, ${article.content}, ${article.imageUrl}, ${article.sourceId},
      ${article.sourceName}, ${article.sourceUrl}, ${article.language}, ${article.publishedAt},
      ${asJson(article.countries)}::jsonb, ${asJson(article.categories)}::jsonb,
      ${asJson(article.keywords)}::jsonb, ${asJson(article.creators)}::jsonb,
      ${JSON.stringify(article.rawJson)}::jsonb
    )
  `;

  return { id: article.id, inserted: true };
}

export async function saveArticleInsight(articleId, insight) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO article_insights (
      article_id, summary, sentiment, sentiment_score, insights, model
    ) VALUES (
      ${articleId}, ${insight.summary}, ${insight.sentiment}, ${insight.sentimentScore},
      ${asJson(insight.insights)}::jsonb, ${insight.model}
    )
    ON CONFLICT (article_id) DO UPDATE SET
      summary = EXCLUDED.summary,
      sentiment = EXCLUDED.sentiment,
      sentiment_score = EXCLUDED.sentiment_score,
      insights = EXCLUDED.insights,
      model = EXCLUDED.model,
      updated_at = NOW()
  `;
}

export async function hasArticleInsight(articleId) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT article_id FROM article_insights WHERE article_id = ${articleId} LIMIT 1`;
  return rows.length > 0;
}

export async function startIngestionRun(query) {
  await ensureSchema();
  const sql = getSql();
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO ingestion_runs (id, status, query)
    VALUES (${id}, 'running', ${query})
  `;
  return id;
}

export async function finishIngestionRun(id, result) {
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE ingestion_runs SET
      status = ${result.status},
      fetched_count = ${result.fetchedCount ?? 0},
      stored_count = ${result.storedCount ?? 0},
      analyzed_count = ${result.analyzedCount ?? 0},
      error_message = ${result.errorMessage ?? null},
      finished_at = NOW()
    WHERE id = ${id}
  `;
}

export async function listArticles(filters = {}) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT a.*, i.summary, i.sentiment, i.sentiment_score, i.insights, i.model
    FROM articles a
    LEFT JOIN article_insights i ON i.article_id = a.id
    ORDER BY COALESCE(a.published_at, a.created_at::text) DESC
    LIMIT 500
  `;

  const search = String(filters.search ?? "").trim().toLowerCase();
  const sentiment = filters.sentiment && filters.sentiment !== "all" ? filters.sentiment : "";
  const source = filters.source && filters.source !== "all" ? filters.source : "";
  const category = filters.category && filters.category !== "all" ? filters.category : "";
  const limit = Math.min(Number(filters.limit) || 60, 200);
  const offset = Number(filters.offset) || 0;

  const filtered = rows.map(hydrateArticle).filter((article) => {
    if (sentiment && article.sentiment !== sentiment) return false;
    if (source && article.sourceName !== source) return false;
    if (category && !article.categories.includes(category)) return false;
    if (!search) return true;

    return [
      article.title,
      article.description,
      article.content,
      article.sourceName,
      article.summary,
      ...(article.insights ?? [])
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  return filtered.slice(offset, offset + limit);
}

export async function getArticleById(id) {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT a.*, i.summary, i.sentiment, i.sentiment_score, i.insights, i.model
    FROM articles a
    LEFT JOIN article_insights i ON i.article_id = a.id
    WHERE a.id = ${id}
    LIMIT 1
  `;

  return rows.length ? hydrateArticle(rows[0]) : null;
}

export async function getStats() {
  await ensureSchema();
  const sql = getSql();
  const articles = await sql`
    SELECT a.source_name, a.categories, i.sentiment
    FROM articles a
    LEFT JOIN article_insights i ON i.article_id = a.id
  `;

  const sources = new Map();
  const categories = new Map();
  const sentiments = { positive: 0, neutral: 0, negative: 0, unanalyzed: 0 };

  for (const article of articles) {
    if (article.source_name) {
      sources.set(article.source_name, (sources.get(article.source_name) ?? 0) + 1);
    }

    const sentiment = article.sentiment ?? "unanalyzed";
    sentiments[sentiment] = (sentiments[sentiment] ?? 0) + 1;

    for (const category of parseJson(article.categories, [])) {
      categories.set(category, (categories.get(category) ?? 0) + 1);
    }
  }

  const latestRuns = await sql`
    SELECT *
    FROM ingestion_runs
    ORDER BY started_at DESC
    LIMIT 1
  `;

  return {
    totalArticles: articles.length,
    analyzedArticles: articles.filter((article) => article.sentiment).length,
    sentiments,
    sources: [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    categories: [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    latestRun: latestRuns[0] ?? null
  };
}

function hydrateArticle(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    link: row.link,
    description: row.description,
    content: row.content,
    imageUrl: row.image_url,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    language: row.language,
    publishedAt: row.published_at,
    countries: parseJson(row.countries, []),
    categories: parseJson(row.categories, []),
    keywords: parseJson(row.keywords, []),
    creators: parseJson(row.creators, []),
    summary: row.summary,
    sentiment: row.sentiment,
    sentimentScore: row.sentiment_score,
    insights: parseJson(row.insights, []),
    model: row.model,
    createdAt: dateString(row.created_at),
    updatedAt: dateString(row.updated_at)
  };
}
