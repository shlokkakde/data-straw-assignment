import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI News Intelligence</p>
          <h1>News Intelligence Platform</h1>
        </div>
        <div className="topbar-actions">
          <div className="run-status" id="runStatus">
            Ready
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="metrics" aria-label="Dashboard metrics">
          <article className="metric">
            <span>Total Articles</span>
            <strong id="totalArticles">0</strong>
          </article>
          <article className="metric">
            <span>Analyzed</span>
            <strong id="analyzedArticles">0</strong>
          </article>
          <article className="metric metric-positive">
            <span>Positive</span>
            <strong id="positiveArticles">0</strong>
          </article>
          <article className="metric metric-negative">
            <span>Negative</span>
            <strong id="negativeArticles">0</strong>
          </article>
        </section>

        <section className="workspace">
          <aside className="filters" aria-label="Filters">
            <label className="field">
              <span>Search</span>
              <input id="searchInput" type="search" placeholder="Topic, source, insight" autoComplete="off" />
            </label>

            <label className="field">
              <span>Sentiment</span>
              <select id="sentimentFilter" defaultValue="all">
                <option value="all">All sentiment</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </label>

            <label className="field">
              <span>Source</span>
              <select id="sourceFilter" defaultValue="all">
                <option value="all">All sources</option>
              </select>
            </label>

            <label className="field">
              <span>Category</span>
              <select id="categoryFilter" defaultValue="all">
                <option value="all">All categories</option>
              </select>
            </label>

            <div className="latest-run" id="latestRun" />
          </aside>

          <section className="feed" aria-live="polite">
            <div className="feed-header">
              <div>
                <p className="eyebrow">Live Database</p>
                <h2>Analyzed Articles</h2>
              </div>
              <button className="button button-secondary" id="resetButton" type="button">
                Reset
              </button>
            </div>

            <div className="article-grid" id="articleGrid" />
          </section>
        </section>
      </main>

      <Script type="module" src="/app.js?v=20260511-2" strategy="afterInteractive" />
    </>
  );
}
