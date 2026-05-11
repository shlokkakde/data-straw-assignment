import { pathToFileURL } from "node:url";
import { getConfig } from "./config.js";
import {
  finishIngestionRun,
  hasArticleInsight,
  saveArticleInsight,
  startIngestionRun,
  upsertArticle
} from "./lib/postgres.js";
import { normalizeNewsArticle } from "./lib/news-article.js";
import { analyzeArticle } from "./ai.js";
import { fetchNewsArticles } from "./newsdata.js";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function dedupeArticles(rawArticles) {
  const seen = new Set();
  const normalized = [];

  for (const raw of rawArticles) {
    const article = normalizeNewsArticle(raw);
    if (!article) continue;

    const key = `${article.externalId}|${article.fingerprint}|${article.link}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(article);
  }

  return normalized;
}

export async function runIngestion(overrides = {}) {
  const config = getConfig(overrides);
  const query = overrides.query ?? config.newsData.query;
  const runId = await startIngestionRun(query);

  try {
    const rawArticles = await fetchNewsArticles({
      ...config.newsData,
      query,
      maxArticles: overrides.maxArticles ?? config.newsData.maxArticles,
      pageSize: overrides.pageSize ?? config.newsData.pageSize
    });

    const normalizedArticles = dedupeArticles(rawArticles);
    let storedCount = 0;
    let analyzedCount = 0;

    for (const article of normalizedArticles) {
      const saved = await upsertArticle(article);
      if (saved.inserted) {
        storedCount += 1;
      }

      if (overrides.forceAnalysis || !(await hasArticleInsight(saved.id))) {
        const insight = await analyzeArticle({ ...article, id: saved.id }, config.ai);
        await saveArticleInsight(saved.id, insight);
        analyzedCount += 1;
      }
    }

    const result = {
      status: "success",
      fetchedCount: rawArticles.length,
      storedCount,
      analyzedCount
    };
    await finishIngestionRun(runId, result);
    return { runId, ...result };
  } catch (error) {
    const result = {
      status: "failed",
      fetchedCount: 0,
      storedCount: 0,
      analyzedCount: 0,
      errorMessage: error.message
    };
    await finishIngestionRun(runId, result);
    throw Object.assign(error, { runId });
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const args = parseArgs(process.argv);
  runIngestion({
    query: args.query,
    maxArticles: args.max ? Number(args.max) : undefined,
    pageSize: args.size ? Number(args.size) : undefined,
    forceAnalysis: Boolean(args.force)
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
