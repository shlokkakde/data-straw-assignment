# AI-Powered News Intelligence Platform

A Vercel-ready news intelligence dashboard built for the Datastraw AI + Tech Intern assignment. The app fetches live articles from NewsData.io, cleans and deduplicates them, stores them in hosted Postgres, enriches them with AI-generated summaries, sentiment, and insights, then presents everything in a responsive dashboard.

Live deployment: https://data-straw-assignment.vercel.app

## Features

- Live NewsData.io ingestion with pagination, retries, validation, and deduplication.
- Hosted Postgres persistence through Neon and `@neondatabase/serverless`.
- Automatic schema creation for articles, AI insights, and ingestion run logs.
- AI enrichment for every article:
  - 1-2 sentence summary
  - Positive, neutral, or negative sentiment
  - 3-5 actionable insights
- Responsive dashboard with real database-backed content.
- Search across titles, sources, summaries, article text, and insights.
- Filters for sentiment, source, and category.
- Automatic background sync when the database is empty or stale.
- Production scheduled sync through Vercel Cron.

## Tech Stack

- **Frontend:** Next.js App Router, React, CSS
- **Backend:** Next.js Route Handlers running as Vercel Functions
- **Database:** Neon Postgres
- **Database Driver:** `@neondatabase/serverless`
- **News Source:** NewsData.io latest endpoint
- **AI Layer:** Local NLP enrichment by default, optional OpenAI-compatible enrichment
- **Deployment:** Vercel

## Architecture

```text
NewsData.io
   -> ingestion pipeline
   -> clean, validate, deduplicate
   -> AI enrichment
   -> Neon Postgres
   -> Next.js API routes
   -> dashboard UI
```

Important files:

- `src/pipeline.js` - fetches, cleans, stores, and analyzes news articles.
- `src/newsdata.js` - NewsData.io API client with pagination and retry handling.
- `src/ai.js` - local NLP analysis and optional OpenAI-compatible analysis.
- `src/lib/postgres.js` - Neon Postgres schema and query layer.
- `src/app/api/*` - serverless API routes.
- `public/app.js` - dashboard interactivity, search, filters, and automatic sync.
- `vercel.json` - production cron schedule.

## Environment Variables

Copy `.env.example` to `.env` for local development, then add the same production values in Vercel Project Settings.

```env
DATABASE_URL=
NEWSDATA_API_KEY=
NEWSDATA_ENDPOINT=https://newsdata.io/api/1/latest
NEWS_QUERY=artificial intelligence OR technology
NEWS_COUNTRY=us,in
NEWS_LANGUAGE=en
NEWS_CATEGORY=business,technology
NEWS_PAGE_SIZE=10
NEWS_MAX_ARTICLES=100
AI_PROVIDER=local
AI_FALLBACK_TO_LOCAL=true
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
INGEST_SECRET=
CRON_SECRET=
```

Required for production:

- `DATABASE_URL`
- `NEWSDATA_API_KEY`
- `CRON_SECRET`

`DATABASE_URL` is provided automatically when Neon is added through Vercel Marketplace. `CRON_SECRET` can be any long random string.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run ingestion manually:

```bash
npm run ingest
```

Run checks:

```bash
npm test
npm run build
```

## Deployment

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Add Neon Postgres from Vercel Marketplace.

   ```bash
   vercel integration add neon
   ```

4. Add `NEWSDATA_API_KEY` in Vercel Project Settings.
5. Add `CRON_SECRET` in Vercel Project Settings.
6. Deploy.

CLI deployment:

```bash
vercel login
vercel
vercel --prod
```

The app also includes `vercel.json`, which schedules automatic production ingestion once per day at `06:00 UTC`.

## API Routes

- `GET /api/health` - health check
- `GET /api/stats` - dashboard metrics, sources, categories, and latest ingestion run
- `GET /api/articles` - article list with optional `search`, `sentiment`, `source`, and `category` filters
- `GET /api/articles/:id` - single article detail
- `POST /api/ingest` - manual ingestion endpoint
- `GET /api/cron/ingest` - protected Vercel Cron ingestion endpoint

If `INGEST_SECRET` is set, `POST /api/ingest` requires an `x-ingest-secret` header. The cron endpoint requires:

```text
Authorization: Bearer <CRON_SECRET>
```

## Database Schema

- `articles` stores cleaned NewsData.io records, source metadata, categories, keywords, raw JSON, and deduplication fingerprints.
- `article_insights` stores AI summaries, sentiment labels, sentiment scores, insights, and model metadata.
- `ingestion_runs` stores pipeline status, counts, errors, and timestamps.

The tables are created automatically on first API or ingestion run.

## Notes

- The dashboard displays real data from Postgres, not mock content.
- The visible manual sync button was intentionally removed because the assignment requires a data pipeline, not an in-app sync control.
- Local AI enrichment keeps the app usable without paid AI calls. Set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY` to use an OpenAI-compatible model.
