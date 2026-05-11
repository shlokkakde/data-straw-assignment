import fs from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILE = path.resolve(process.cwd(), ".env");

export function loadEnv(filePath = DEFAULT_ENV_FILE) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function csv(value, fallback = []) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function intValue(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function boolValue(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function getConfig(overrides = {}) {
  loadEnv();

  return {
    port: intValue(overrides.port ?? process.env.PORT, 3000),
    databaseUrl:
      overrides.databaseUrl ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      process.env.NEON_DATABASE_URL ??
      "",
    ingestSecret: overrides.ingestSecret ?? process.env.INGEST_SECRET ?? "",
    newsData: {
      apiKey: overrides.newsDataApiKey ?? process.env.NEWSDATA_API_KEY ?? "",
      endpoint:
        overrides.newsDataEndpoint ??
        process.env.NEWSDATA_ENDPOINT ??
        "https://newsdata.io/api/1/latest",
      query: overrides.query ?? process.env.NEWS_QUERY ?? "artificial intelligence OR technology",
      country: csv(overrides.country ?? process.env.NEWS_COUNTRY, ["us", "in"]),
      language: csv(overrides.language ?? process.env.NEWS_LANGUAGE, ["en"]),
      category: csv(overrides.category ?? process.env.NEWS_CATEGORY, ["business", "technology"]),
      pageSize: intValue(overrides.pageSize ?? process.env.NEWS_PAGE_SIZE, 10),
      maxArticles: intValue(overrides.maxArticles ?? process.env.NEWS_MAX_ARTICLES, 100)
    },
    ai: {
      provider: overrides.aiProvider ?? process.env.AI_PROVIDER ?? "local",
      fallbackToLocal: boolValue(
        overrides.aiFallbackToLocal ?? process.env.AI_FALLBACK_TO_LOCAL,
        true
      ),
      openAiApiKey: overrides.openAiApiKey ?? process.env.OPENAI_API_KEY ?? "",
      openAiBaseUrl:
        overrides.openAiBaseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      openAiModel: overrides.openAiModel ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini"
    }
  };
}
