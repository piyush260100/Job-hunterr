# Design Document

## Overview

Job Hunter is a MERN application composed of two deployable units:

- **server** — a Node.js + Express API that owns the database, runs scheduled fetchers,
  normalizes and scores listings, generates optional tailored documents, and sends alerts.
- **client** — a React (Vite) single-page dashboard that talks to the server REST API.

The system is **assisted-apply**: it automates discovery, ranking, and document prep, but
never submits applications. Listings are fetched only from legal, configurable sources.

```
+-------------------+        REST/JSON        +---------------------------+
|   client (React)  | <---------------------> |      server (Express)     |
|   dashboard       |                         |                           |
+-------------------+                         |  routes -> controllers    |
                                              |      -> services          |
                                              |  scheduler (node-cron)    |
                                              |      -> fetchers          |
                                              +------------+--------------+
                                                           |
                                        +------------------+------------------+
                                        |                  |                  |
                                   MongoDB (Atlas)    Job Source APIs    Notif (SMTP/
                                   via Mongoose       / RSS feeds        Telegram)
```

## Architecture

### Backend layering
Request flow: `routes -> controllers -> services -> models`. Scheduled flow:
`jobs (cron) -> services (fetchers, matcher, notifier) -> models`.

- **models/** Mongoose schemas: `Profile`, `Preferences`, `Source`, `Listing`.
- **routes/** Express routers mapping HTTP endpoints to controllers.
- **controllers/** thin request handlers; validate input, call services, shape responses.
- **services/**
  - `resumeService` — parse uploaded PDF into structured profile fields.
  - `sourceService` — registry of source adapters; enable/disable based on env keys.
  - `fetchService` — orchestrates a fetch cycle across enabled sources.
  - `matchService` — computes match scores.
  - `documentService` — optional LLM-based resume/cover-letter generation.
  - `notificationService` — email (nodemailer) and optional Telegram.
- **jobs/** `fetchCycle` cron task wiring fetch -> normalize -> dedupe -> score -> alert.
- **config/** env loading + Mongo connection.
- **utils/** logger, text helpers, dedupe hashing.

### Source adapter pattern
Each job source implements a common interface so new legal sources can be added without
touching the orchestrator:

```
interface SourceAdapter {
  key: string;                 // e.g. "remotive"
  isEnabled(env): boolean;     // true only if required config present
  fetch(preferences): Promise<RawListing[]>;
  normalize(raw): Listing;     // map to common schema
}
```

Initial adapters (all legal, free tiers):
- **remotive** — Remotive public API (no key required). Good first adapter for end-to-end.
- **adzuna** — Adzuna API (requires app id + key; disabled if absent).
- **jooble** — Jooble API (requires key; disabled if absent).
- **rss** — generic RSS/Atom adapter for company career feeds (configurable URLs).

The `sourceService` builds the active adapter list at startup by calling `isEnabled(env)`,
satisfying Requirement 3.6 and 8.3 (graceful degradation).

## Data Models

The persistence layer uses four Mongoose models: `Profile`, `Preferences`, `Source`, and
`Listing`. Schemas are detailed below under Components and Interfaces.

## Components and Interfaces

### Data Models (Mongoose)

**Profile**
```
{
  _id,
  name: String,
  email: String,
  phone: String,
  links: { linkedin, github, portfolio },
  skills: [String],
  titles: [String],              // roles held / targeted, derived from resume
  experience: [{ company, role, start, end, summary }],
  locations: [String],
  rawResumeText: String,         // extracted text, for reference/AI
  resumeFileName: String,
  updatedAt
}
```

**Preferences**
```
{
  _id,
  titles: [String],              // search titles/keywords
  keywords: [String],
  locations: [String],
  remote: Boolean,
  onsite: Boolean,
  salaryFloor: Number,           // optional
  strongMatchThreshold: Number,  // default 70
  fetchIntervalMinutes: Number,  // default 15
  updatedAt
}
```

**Source**
```
{
  _id,
  key: String,                   // "remotive" | "adzuna" | ...
  label: String,
  enabled: Boolean,              // user toggle; effective only if env-configured
  config: Object,                // non-secret source config (e.g., rss urls)
  lastFetchedAt: Date,
  lastStatus: String             // "ok" | "error" | "rate_limited" | "disabled"
}
```

**Listing**
```
{
  _id,
  dedupeKey: String (unique),    // hash of source + external id / url
  sourceKey: String,
  externalId: String,
  title: String,
  company: String,
  location: String,
  remote: Boolean,
  url: String,                   // apply link on original source
  description: String,
  postedAt: Date,
  fetchedAt: Date,
  matchScore: Number,            // 0-100
  isStrongMatch: Boolean,
  status: String,                // new|saved|applied|rejected|interview
  notified: Boolean,             // alert sent?
  tailoredDocs: { resume: String, coverLetter: String } // optional
}
```

### REST API

Profile & preferences
- `GET  /api/profile` — current profile
- `PUT  /api/profile` — update profile fields
- `POST /api/profile/resume` — upload resume (multipart); parse + populate
- `GET  /api/preferences`
- `PUT  /api/preferences`

Sources
- `GET  /api/sources` — list sources with enabled/effective status
- `PUT  /api/sources/:key` — toggle enabled / update non-secret config

Listings
- `GET  /api/listings` — query: status, source, minScore, sort (default score desc)
- `GET  /api/listings/:id`
- `PATCH /api/listings/:id/status` — update application status
- `POST /api/listings/:id/tailor` — generate tailored docs (if LLM configured)

Fetching
- `POST /api/fetch/run` — trigger a fetch cycle on demand (in addition to cron)

Health
- `GET  /api/health`

### Matching algorithm (matchService)

Score (0-100) is a weighted sum of normalized sub-scores:

- **Skill overlap (50%)**: |profile.skills ∩ listing keywords| / |profile.skills|,
  using case-insensitive token matching against title + description.
- **Title relevance (30%)**: best fuzzy/token match between preferences.titles and the
  listing title.
- **Location/remote fit (20%)**: full score if listing is remote and user wants remote, or
  location matches a preferred location; partial/zero otherwise.

`isStrongMatch = score >= preferences.strongMatchThreshold`.

The weights and threshold are centralized in a config module so a "matching rule change"
is a config/steering edit, not scattered code (satisfies rules.md §5).

### Scheduler (jobs/fetchCycle)

- node-cron scheduled every `preferences.fetchIntervalMinutes`.
- Cycle: for each enabled+configured source -> `fetch(preferences)` -> `normalize` ->
  dedupe by `dedupeKey` -> insert new -> `matchService.score` -> if strong & not notified
  -> `notificationService.send` -> mark notified.
- Per-source errors are caught, logged, recorded on `Source.lastStatus`, and do not abort
  the cycle (Requirement 3.4).

### Document generation (documentService, optional)

- Enabled only if `LLM_API_KEY` (provider-agnostic) is present.
- Given a listing + profile, builds a prompt and requests a tailored resume + cover letter.
- Returns text for user review/edit/download. Never auto-sends (Requirement 6.4).
- Provider wrapper isolates the specific LLM SDK so it can be swapped.

### Notifications (notificationService, optional)

- Email via nodemailer using SMTP env config. Telegram via bot token + chat id (optional).
- If no channel configured, no-op (records remain in dashboard) — Requirement 7.2.
- Dedupe via `Listing.notified` flag — Requirement 7.3.

## Frontend (client)

- **Vite + React**, function components + hooks.
- `services/api.js` centralizes all HTTP calls (base URL via env `VITE_API_URL`).
- Pages/components:
  - `ProfilePage` — upload resume, view/edit parsed profile.
  - `PreferencesPage` — edit search preferences and thresholds.
  - `SourcesPage` — toggle sources, see effective status.
  - `DashboardPage` — ranked listings table with filters (status, source, minScore).
  - `ListingDetail` — full details, apply link, status control, tailor button (if enabled).
- State kept simple with React hooks + a small data-fetching layer; no heavy state lib
  initially.

## Error Handling

- Controllers wrap service calls; return structured JSON errors `{ error: { message } }`
  with appropriate HTTP status.
- External calls (source APIs, LLM, SMTP) use try/catch; failures are logged and surfaced
  as recoverable (cycle continues, feature degrades) rather than fatal.
- Core startup failures (missing `MONGODB_URI`) fail fast with a clear message.
- Input validation on all write endpoints (body shape, file type/size for upload).

## Configuration & Secrets

`.env` (git-ignored) with `.env.example` documenting keys:
```
# Core
MONGODB_URI=
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# Sources (optional; absent = source disabled)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
JOOBLE_API_KEY=
RSS_FEED_URLS=            # comma-separated

# LLM (optional; absent = tailoring disabled)
LLM_API_KEY=
LLM_PROVIDER=            # e.g. openai|anthropic

# Notifications (optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
ALERT_EMAIL_TO=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

## Correctness Properties

Property 1: Dedupe invariant — no two `Listing` records share the same `dedupeKey`;
re-fetching an already-stored posting never creates a duplicate record.
**Validates: Requirements 3.3**

Property 2: Score bounds — every computed `matchScore` is an integer within [0, 100].
**Validates: Requirements 4.1**

Property 3: Strong-match consistency — `isStrongMatch` is true if and only if
`matchScore >= strongMatchThreshold`.
**Validates: Requirements 4.4**

Property 4: Notification idempotency — at most one alert is ever sent per listing; the
`notified` flag flips to true on send and the listing is never notified again.
**Validates: Requirements 7.3**

Property 5: Legal-source invariant — the active adapter set contains only ToS-compliant
sources; no adapter performs scraping of a prohibited platform.
**Validates: Requirements 3.1, 3.5**

Property 6: Graceful degradation — a source missing its required env config is excluded
from the active set rather than causing a fetch-cycle failure.
**Validates: Requirements 3.4, 3.6, 8.3**

Property 7: No auto-apply — no code path submits an application to an external source.
**Validates: Requirements 5.5, 6.4**

## Testing Strategy

- **Unit tests** for pure logic: `matchService` scoring, normalization in adapters,
  dedupe key generation. Use the user's base profile vs sample listings as fixtures.
- **Adapter tests** with mocked HTTP responses (no live external calls in tests).
- **API tests** for controllers using an in-memory/mocked Mongo where practical.
- Tests are added alongside the logic they cover; external network is always mocked.
- Test runner: Vitest (works for both server logic and client) or Jest for server; chosen
  during setup and recorded in tech.md.

## Deployment (informational)
- DB: MongoDB Atlas free tier.
- Server: Render/Railway (free/low tier). Scheduler runs in-process.
- Client: Vercel/Netlify static hosting, `VITE_API_URL` pointing at the server.

## Requirements traceability
- R1 Resume ingestion -> resumeService, Profile model, `/api/profile/resume`, ProfilePage.
- R2 Preferences -> Preferences model, `/api/preferences`, PreferencesPage.
- R3 Legal scheduled fetch -> sourceService adapters, fetchService, jobs/fetchCycle.
- R4 Matching/ranking -> matchService, Listing.matchScore, sorted listings endpoint.
- R5 Dashboard/tracking -> listings endpoints, DashboardPage, status PATCH.
- R6 AI documents -> documentService, `/api/listings/:id/tailor` (gated by LLM key).
- R7 Alerts -> notificationService, notified flag, cron integration.
- R8 Config/secrets -> config module, `.env.example`, graceful degradation.
