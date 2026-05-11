import crypto from "node:crypto";

export function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeWhitespace(item)).filter(Boolean);
  }

  if (value == null || value === "") {
    return [];
  }

  return [normalizeWhitespace(value)].filter(Boolean);
}

export function createFingerprint(article) {
  const basis = normalizeWhitespace(
    `${article.title ?? ""} ${article.source_name ?? ""} ${article.pubDate ?? ""}`
  ).toLowerCase();

  return crypto.createHash("sha256").update(basis).digest("hex");
}

export function normalizeNewsArticle(raw) {
  const title = normalizeWhitespace(raw.title);
  const link = normalizeWhitespace(raw.link);
  const description = normalizeWhitespace(raw.description);
  const content = normalizeWhitespace(raw.content);
  const publishedAt = normalizeWhitespace(raw.pubDate ?? raw.pub_date ?? raw.published_at);

  if (!title || !link) {
    return null;
  }

  const externalId = normalizeWhitespace(raw.article_id ?? raw.id);
  const fingerprint = createFingerprint(raw);
  const id = externalId || crypto.createHash("sha256").update(`${title}|${link}`).digest("hex");

  return {
    id,
    externalId: externalId || null,
    fingerprint,
    title,
    link,
    description,
    content,
    imageUrl: normalizeWhitespace(raw.image_url ?? raw.imageUrl),
    sourceId: normalizeWhitespace(raw.source_id ?? raw.sourceId),
    sourceName: normalizeWhitespace(raw.source_name ?? raw.sourceName) || "Unknown source",
    sourceUrl: normalizeWhitespace(raw.source_url ?? raw.sourceUrl),
    language: normalizeWhitespace(raw.language),
    publishedAt: publishedAt || null,
    countries: normalizeArray(raw.country ?? raw.countries),
    categories: normalizeArray(raw.category ?? raw.categories),
    keywords: normalizeArray(raw.keywords),
    creators: normalizeArray(raw.creator ?? raw.creators),
    rawJson: raw
  };
}
