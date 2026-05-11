# AI-Powered News Intelligence Platform

This is a Vercel-ready implementation of the Datastraw AI + Tech Intern assignment. It includes a Next.js dashboard, serverless API routes, a NewsData.io ingestion pipeline, hosted Postgres storage, and AI-generated article summaries, sentiment, and insights.

## Stack

- **App:** Next.js App Router
- **Hosting:** Vercel
- **Database:** Hosted Postgres, recommended through Neon on Vercel Marketplace
- **Driver:** `@neondatabase/serverless`
- **News API:** NewsData.io latest endpoint with pagination, retries, validation, and deduplication
- **AI:** Local NLP enrichment by default, optional OpenAI-compatible enrichment through env vars

## Environment Variables

Create `.env` locally and add the same values in Vercel Project Settings.

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

`DATABASE_URL` should be a Neon Postgres connection string. The easiest path is Vercel Dashboard -> Marketplace -> Neon -> Add to project.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To fetch and analyze articles:

```bash
npm run ingest
```

The schema is created automatically on first API or ingestion run.

The dashboard runs a background sync when the database is empty or stale. Production deployments also include a Vercel Cron job that calls `/api/cron/ingest` daily at 06:00 UTC. Set `CRON_SECRET` in Vercel so the cron endpoint can verify scheduled requests.

## Vercel Deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add Neon Postgres from Vercel Marketplace, or manually set a Neon `DATABASE_URL`.

   ```bash
   vercel integration add neon
   ```

   You can also use Vercel Dashboard -> Storage/Marketplace -> Neon.
4. Add `NEWSDATA_API_KEY` and any optional AI variables in Vercel Project Settings.
5. Add `CRON_SECRET` in Vercel Project Settings. Use any long random value.
6. Deploy.
7. Open the deployed app. It will sync automatically when the database is empty or stale, and the production cron job will keep it refreshed. You can also run ingestion locally against the hosted DB:

   ```bash
   npm run ingest
   ```

CLI deployment:

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## API Routes

- `GET /api/health`
- `GET /api/stats`
- `GET /api/articles?search=ai&sentiment=positive&source=Example&category=technology`
- `GET /api/articles/:id`
- `POST /api/ingest`

Set `INGEST_SECRET` to require an `x-ingest-secret` header for API-triggered ingestion.

## Database Design

`articles` stores cleaned NewsData.io records with source metadata, categories, keywords, raw JSON, and a fingerprint for deduplication.

`article_insights` stores AI-generated summaries, sentiment labels, sentiment scores, insights, and the model used.

`ingestion_runs` records each pipeline execution with counts and errors for observability.
