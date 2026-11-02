# Architecture

Job Hunter is a two-part MERN application.

```
client (React/Vite)  <--REST/JSON-->  server (Express)
                                         |
                      +------------------+------------------+
                      |                  |                  |
                 MongoDB (Atlas)    Job source APIs    Notifications
                 via Mongoose       / RSS feeds        (SMTP / Telegram)
```

## Server layering

Request flow: `routes -> controllers -> services -> models`
Scheduled flow: `jobs/fetchCycle (cron) -> services -> models`

- `models/` — Mongoose schemas: Profile, Preferences, Source, Listing.
- `routes/` — Express routers.
- `controllers/` — thin request handlers (validate, call service, shape response).
- `services/`
  - `resumeService` — parse an uploaded PDF into structured fields.
  - `profileService` / `preferencesService` — single-document persistence helpers.
  - `sourceService` — adapter registry; activates adapters by env config + user toggle.
  - `sources/*Adapter.js` — one legal source each (Remotive, Adzuna, Jooble, RSS).
  - `fetchService` — one fetch cycle: fetch -> normalize -> dedupe -> insert -> score.
  - `matchService` — scoring against profile/preferences.
  - `documentService` — optional LLM tailoring (gated on LLM_API_KEY).
  - `notificationService` — email + optional Telegram; no-op if unconfigured.
- `jobs/fetchCycle.js` — cron schedule + strong-match notification wiring.
- `config/` — env loading/validation, DB connection, matching weights.
- `utils/` — logger, text helpers, dedupe hashing.

## Data flow for a fetch cycle

1. Scheduler (or `POST /api/fetch/run`) triggers `runFetchCycle`.
2. `getActiveAdapters` returns adapters that are both env-configured and user-enabled.
3. For each adapter: `fetch(preferences)` -> `normalize(raw)` for each item.
4. A `dedupeKey` (sha1 of source + external id/url) prevents duplicates.
5. New listings get a `matchScore` and `isStrongMatch` from `matchService`.
6. New strong matches trigger a one-time notification (`notified` flag).
7. Per-source errors are logged and recorded; they never abort the cycle.

## Key invariants

See the design's Correctness Properties: dedupe uniqueness, score in [0,100],
strong-match consistency, notification idempotency, legal-source-only adapters,
graceful degradation, and no auto-apply.
