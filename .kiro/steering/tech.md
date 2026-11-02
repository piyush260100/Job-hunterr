# Tech Stack & Conventions

## Stack
- **Database**: MongoDB (Atlas free tier for hosting). Mongoose ODM.
- **Backend**: Node.js + Express. ES modules.
- **Frontend**: React (Vite). 
- **Scheduler**: node-cron for periodic job fetching.
- **Package manager**: npm.

## Repository layout
```
/server        Express API, fetchers, matching engine, scheduler
/client        React (Vite) dashboard
/docs          Project documentation
/.kiro         Steering + specs
```

## Backend conventions
- ES modules (`"type": "module"`).
- Folder structure under /server/src:
  - `models/`      Mongoose schemas
  - `routes/`      Express route definitions
  - `controllers/` request handlers
  - `services/`    business logic (fetchers, matcher, documents, notifications)
  - `jobs/`        scheduled tasks (cron)
  - `config/`      env + db connection
  - `utils/`       shared helpers
- Config/secrets via environment variables (dotenv). Never commit `.env`.

## Frontend conventions
- React function components + hooks.
- API calls centralized in a `services/api` module.
- Keep components small and focused.

## Common commands
- Install: `npm install` (run in /server and /client)
- Backend dev: `npm run dev` (in /server)
- Frontend dev: `npm run dev` (in /client)
- Note: dev servers are long-running; the user runs these manually.

## External services (all pluggable, configured via env)
- Job source APIs: Adzuna, Jooble, Remotive (free tiers).
- LLM provider (optional): for resume/cover-letter tailoring. Off unless key present.
- Email: SMTP (nodemailer). Telegram bot (optional).
