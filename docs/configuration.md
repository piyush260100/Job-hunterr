# Configuration

All configuration is via environment variables. Copy `server/.env.example` to
`server/.env` and fill in values. Secrets are never committed (see `.gitignore`).

## Core (required)

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Server fails fast if missing. |
| `PORT` | API port (default 4000). |
| `CLIENT_ORIGIN` | Allowed CORS origin (default `http://localhost:5173`). |

## Corporate network (optional)

If outbound HTTPS to job APIs fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, your
network uses a TLS-intercepting proxy. Fix it with one of:

| Variable | Description |
| --- | --- |
| `NODE_EXTRA_CA_CERTS` | Path to your company's root CA bundle (PEM). Recommended, secure fix. Node reads it natively. |
| `HTTPS_PROXY` | Explicit proxy URL, e.g. `http://proxy-host:8080`. Routes `fetch()` through an undici ProxyAgent. |

How to get the corporate root CA (Windows): export it from Certificate Manager
(`certmgr.msc` → Trusted Root Certification Authorities) as Base-64 `.cer`/`.pem`, or ask
your IT team. Then set `NODE_EXTRA_CA_CERTS` to that file path. Never disable TLS
verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`) outside quick local diagnosis.

## Job sources (optional — absent = source auto-disabled)

| Variable | Source | Notes |
| --- | --- | --- |
| (none) | Remotive | Always enabled; no key required. |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Adzuna | Both required to enable. |
| `ADZUNA_COUNTRY` | Adzuna | Country code (default `in`). |
| `JOOBLE_API_KEY` | Jooble | Required to enable. |
| `RSS_FEED_URLS` | RSS | Comma-separated feed URLs. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_ACCESS_TOKEN` / `LINKEDIN_API_BASE_URL` | LinkedIn | Official Partner API. All four required. See [linkedin-official-api.md](./linkedin-official-api.md). |

## LLM tailoring (optional — absent = feature disabled)

| Variable | Description |
| --- | --- |
| `LLM_PROVIDER` | `openai` (default) or `anthropic`. |
| `LLM_API_KEY` | Provider API key. Tailoring is hidden/blocked without it. |

## Notifications (optional — absent = dashboard-only)

| Variable | Description |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP server for email alerts. |
| `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` | From/to addresses for alerts. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional Telegram alerts. |

## Client

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the server API (default `http://localhost:4000`). |

## Graceful degradation

Missing optional config disables only the related source/feature. The app still starts
and runs. Only missing core config (`MONGODB_URI`) stops startup.
