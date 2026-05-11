const state = {
  articles: [],
  stats: null,
  syncAttempted: false,
  filters: {
    search: "",
    sentiment: "all",
    source: "all",
    category: "all"
  }
};

const elements = {
  articleGrid: document.querySelector("#articleGrid"),
  searchInput: document.querySelector("#searchInput"),
  sentimentFilter: document.querySelector("#sentimentFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  resetButton: document.querySelector("#resetButton"),
  runStatus: document.querySelector("#runStatus"),
  latestRun: document.querySelector("#latestRun"),
  totalArticles: document.querySelector("#totalArticles"),
  analyzedArticles: document.querySelector("#analyzedArticles"),
  positiveArticles: document.querySelector("#positiveArticles"),
  negativeArticles: document.querySelector("#negativeArticles")
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function debounce(fn, wait = 250) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function setStatus(message) {
  elements.runStatus.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function currentQueryString() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) {
    if (value && value !== "all") params.set(key, value);
  }
  return params.toString();
}

function latestRunAgeMs(stats) {
  const rawDate = stats.latestRun?.finished_at || stats.latestRun?.started_at;
  if (!rawDate) return Number.POSITIVE_INFINITY;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Date.now() - date.getTime();
}

function shouldAutoSync(stats) {
  const sixHours = 6 * 60 * 60 * 1000;
  return !state.syncAttempted && (stats.totalArticles === 0 || latestRunAgeMs(stats) > sixHours);
}

async function loadStats() {
  state.stats = await api("/api/stats");
  renderStats();
  renderFilterOptions();
}

async function loadArticles() {
  const query = currentQueryString();
  const payload = await api(`/api/articles${query ? `?${query}` : ""}`);
  state.articles = payload.articles;
  renderArticles();
}

function renderStats() {
  const stats = state.stats;
  elements.totalArticles.textContent = stats.totalArticles;
  elements.analyzedArticles.textContent = stats.analyzedArticles;
  elements.positiveArticles.textContent = stats.sentiments.positive || 0;
  elements.negativeArticles.textContent = stats.sentiments.negative || 0;

  if (!stats.latestRun) {
    elements.latestRun.textContent = "No ingestion run yet.";
    return;
  }

  const latest = stats.latestRun;
  elements.latestRun.innerHTML = `
    <strong>Latest run</strong><br />
    ${latest.status} - fetched ${latest.fetched_count} - stored ${latest.stored_count} - analyzed ${latest.analyzed_count}<br />
    ${formatDate(latest.finished_at || latest.started_at)}
  `;
}

function renderFilterOptions() {
  const currentSource = elements.sourceFilter.value;
  const currentCategory = elements.categoryFilter.value;

  elements.sourceFilter.replaceChildren(option("all", "All sources"));
  for (const source of state.stats.sources) {
    elements.sourceFilter.append(option(source.name, `${source.name} (${source.count})`));
  }

  elements.categoryFilter.replaceChildren(option("all", "All categories"));
  for (const category of state.stats.categories) {
    elements.categoryFilter.append(option(category.name, `${category.name} (${category.count})`));
  }

  elements.sourceFilter.value = [...elements.sourceFilter.options].some((item) => item.value === currentSource)
    ? currentSource
    : "all";
  elements.categoryFilter.value = [...elements.categoryFilter.options].some((item) => item.value === currentCategory)
    ? currentCategory
    : "all";
}

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function createArticleCard(article) {
  const card = createElement("article", "article-card");
  const media = createElement("a", "media");
  media.href = article.link;
  media.target = "_blank";
  media.rel = "noreferrer";

  if (article.imageUrl) {
    const image = document.createElement("img");
    image.alt = article.title;
    image.loading = "lazy";
    image.src = article.imageUrl;
    media.append(image);
  } else {
    const fallback = createElement("span", "media-fallback", (article.sourceName || "N").slice(0, 1).toUpperCase());
    media.setAttribute("aria-label", article.sourceName || "News source");
    media.append(fallback);
  }

  const body = createElement("div", "article-body");
  const meta = createElement("div", "article-meta");
  const sentiment = article.sentiment || "neutral";
  meta.append(
    createElement("span", "source", article.sourceName || "Unknown source"),
    createElement("span", "published", formatDate(article.publishedAt)),
    createElement("span", `sentiment ${sentiment}`, sentiment)
  );

  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.href = article.link;
  titleLink.target = "_blank";
  titleLink.rel = "noreferrer";
  titleLink.textContent = article.title;
  title.append(titleLink);

  const summary = createElement("p", "summary", article.summary || article.description || "Analysis pending.");
  const insights = createElement("ul", "insights");
  for (const insight of (article.insights || []).slice(0, 5)) {
    insights.append(createElement("li", "", insight));
  }

  const tags = createElement("div", "tag-row");
  for (const tag of [...(article.categories || []), ...(article.keywords || []).slice(0, 2)].slice(0, 5)) {
    tags.append(createElement("span", "tag", tag));
  }

  body.append(meta, title, summary, insights, tags);
  card.append(media, body);
  return card;
}

function renderArticles() {
  elements.articleGrid.replaceChildren();

  if (!state.articles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No articles match the current view.";
    elements.articleGrid.append(empty);
    return;
  }

  elements.articleGrid.append(...state.articles.map(createArticleCard));
}

async function runIngestion() {
  state.syncAttempted = true;
  setStatus("Syncing");
  await api("/api/ingest", {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function refresh() {
  setStatus("Loading");
  try {
    await loadStats();
    if (shouldAutoSync(state.stats)) {
      await runIngestion();
      await loadStats();
    }
    await loadArticles();
    setStatus("Ready");
  } catch (error) {
    setStatus("Error");
    elements.articleGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function updateFilter(key, value) {
  state.filters[key] = value;
  loadArticles().catch((error) => {
    setStatus("Error");
    elements.articleGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  });
}

elements.searchInput.addEventListener(
  "input",
  debounce((event) => updateFilter("search", event.target.value.trim()), 220)
);
elements.sentimentFilter.addEventListener("change", (event) => updateFilter("sentiment", event.target.value));
elements.sourceFilter.addEventListener("change", (event) => updateFilter("source", event.target.value));
elements.categoryFilter.addEventListener("change", (event) => updateFilter("category", event.target.value));
elements.resetButton.addEventListener("click", () => {
  state.filters = { search: "", sentiment: "all", source: "all", category: "all" };
  elements.searchInput.value = "";
  elements.sentimentFilter.value = "all";
  elements.sourceFilter.value = "all";
  elements.categoryFilter.value = "all";
  loadArticles();
});

refresh();
