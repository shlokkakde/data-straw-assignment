const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendList(params, key, value) {
  const items = Array.isArray(value) ? value : [value].filter(Boolean);
  if (items.length) {
    params.set(key, items.join(","));
  }
}

export async function fetchNewsPage(options) {
  const {
    apiKey,
    endpoint,
    query,
    country,
    language,
    category,
    pageSize,
    page,
    signal
  } = options;

  if (!apiKey) {
    throw new Error("NEWSDATA_API_KEY is required for live ingestion.");
  }

  const url = new URL(endpoint);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("removeduplicate", "1");
  url.searchParams.set("size", String(pageSize));
  appendList(url.searchParams, "country", country);
  appendList(url.searchParams, "language", language);
  appendList(url.searchParams, "category", category);
  if (page) {
    url.searchParams.set("page", page);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { status: "error", message: text };
  }

  if (!response.ok || payload.status === "error") {
    const reason = payload.message || payload.results?.message || response.statusText;
    const error = new Error(`NewsData.io request failed: ${reason}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export async function fetchNewsArticles(options) {
  const maxArticles = Math.max(1, options.maxArticles ?? 100);
  const pageSize = Math.min(Math.max(options.pageSize ?? 10, 1), 50);
  const articles = [];
  let nextPage = null;

  while (articles.length < maxArticles) {
    let payload;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        payload = await fetchNewsPage({ ...options, pageSize, page: nextPage });
        break;
      } catch (error) {
        if (!RETRYABLE_STATUS.has(error.status) || attempt === 3) {
          throw error;
        }
        await delay(500 * attempt ** 2);
      }
    }

    const pageResults = Array.isArray(payload.results) ? payload.results : [];
    articles.push(...pageResults);

    nextPage = payload.nextPage;
    if (!nextPage || pageResults.length === 0) {
      break;
    }
  }

  return articles.slice(0, maxArticles);
}
