Subject: AI + Tech Intern Assignment Submission

Hello Datastraw Team,

Please find my AI + Tech Intern assignment submission below.

GitHub repository: [add repository link]

I built an AI-powered News Intelligence Platform that fetches live articles from NewsData.io, cleans and deduplicates the data, stores it in hosted Postgres, enriches each article with summaries, sentiment, and actionable insights, and presents the results in a responsive web dashboard.

Technology selection:

- Next.js App Router makes the frontend and backend API routes straightforward to deploy on Vercel.
- Hosted Postgres through Neon provides persistent SQL storage for articles, AI insights, and ingestion runs.
- The enrichment layer supports a dependency-free local NLP mode and can be switched to an OpenAI-compatible model through environment variables.
- The frontend is served by the backend and focuses on fast search, filtering, clear article cards, and source/category/sentiment visibility.

Key features I am proud of:

- End-to-end ingestion pipeline with pagination, retries, validation, deduplication, database persistence, and run logging.
- Clean dashboard that displays only database-backed articles, not mock content.
- Search and filters across sentiment, source, and category.
- Resilient AI layer with local fallback so ingestion can continue even if an external model API is unavailable.

With additional time, I would add scheduled ingestion, richer trend analytics, multi-user saved searches, and a production deployment using a managed persistent database.

Regards,

[Your Name]
