# Job Hunter

An assisted job-application tool (MERN). It automatically discovers job listings from
**legal, official sources**, ranks them against your resume, optionally drafts tailored
application documents, and alerts you to strong matches — while **you** stay in control of
the final "apply".

> This tool does **not** scrape LinkedIn (or any platform that prohibits automated access)
> and does **not** auto-submit applications on third-party sites. See
> `.kiro/steering/rules.md` for the hard constraints.

## Why assisted-apply (not a bot)

Fully automated scraping + auto-applying on LinkedIn violates its Terms of Service and
gets accounts banned. Job Hunter gets you most of the speed benefit — automated discovery,
ranking, and document prep — without that risk.

## Architecture

```
/server   Express API, legal job fetchers, matching engine, scheduler
/client   React (Vite) dashboard
/docs     Documentation
/.kiro    Steering rules + the project spec
```

See the spec in `.kiro/specs/job-hunter/` (requirements, design, tasks) and `/docs`.

## Prerequisites

- Node.js 18+
- npm
- A MongoDB connection string (MongoDB Atlas free tier works)

## Setup

1. Backend
   ```
   cd server
   npm install
   copy .env.example .env   # then fill in values (at least MONGODB_URI)
   npm run dev
   ```
2. Frontend
   ```
   cd client
   npm install
   npm run dev
   ```

## Configuration

All secrets and source toggles are environment variables. See `server/.env.example` for
the full list. Optional integrations (Adzuna, Jooble, RSS feeds, an LLM provider, SMTP,
Telegram) are disabled automatically when their keys are absent — the app still runs.

## Legal sources

Out of the box the app supports Remotive (no key), plus Adzuna, Jooble, and generic
RSS/Atom career feeds when configured. Adding a new source means writing a small adapter;
see `/docs`.
