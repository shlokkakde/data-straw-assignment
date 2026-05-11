import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNewsArticle } from "../src/lib/news-article.js";
import { localAnalyzeArticle } from "../src/ai.js";

const rawArticle = {
  article_id: "article-1",
  title: "AI breakthrough boosts hospital diagnosis speed",
  link: "https://example.com/ai-health",
  description:
    "A new artificial intelligence system improved diagnosis speed and gave clinicians stronger decision support.",
  content:
    "The hospital reported a breakthrough in artificial intelligence operations. The launch improved triage accuracy, reduced delays, and created a strong opportunity for clinical teams.",
  pubDate: "2026-05-11 09:30:00",
  source_id: "example",
  source_name: "Example News",
  source_url: "https://example.com",
  language: "english",
  country: ["united states"],
  category: ["technology", "health"],
  keywords: ["AI", "healthcare"]
};

test("normalizes a real NewsData-shaped article for hosted Postgres storage", () => {
  const article = normalizeNewsArticle(rawArticle);

  assert.equal(article.id, "article-1");
  assert.equal(article.title, rawArticle.title);
  assert.equal(article.sourceName, "Example News");
  assert.deepEqual(article.categories, ["technology", "health"]);
  assert.deepEqual(article.keywords, ["AI", "healthcare"]);
  assert.ok(article.fingerprint.length > 20);
});

test("local AI enrichment returns required summary, sentiment, and insights", () => {
  const article = normalizeNewsArticle(rawArticle);
  const insight = localAnalyzeArticle({ ...article });

  assert.equal(insight.sentiment, "positive");
  assert.ok(insight.summary.length > 20);
  assert.ok(insight.insights.length >= 3);
  assert.equal(insight.model, "local:nlp-v1");
});
