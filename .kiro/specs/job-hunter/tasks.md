# Implementation Plan

## Overview

This plan builds the Job Hunter MERN app in dependency order: project scaffold and config
first, then data models, then backend features (resume ingestion, preferences, legal source
adapters, matching, fetch scheduler, listings API, notifications, optional AI tailoring),
then the server entrypoint, then the React client, and finally documentation. Tasks marked
with `*` are optional unit tests that can be skipped without blocking later work. External
network calls are always mocked in tests.

## Tasks

- [x] 1. Scaffold the monorepo structure and root docs
  - Create `/server`, `/client`, `/docs` folders and a root `README.md` describing the project, legal stance, and setup.
  - Add root `.gitignore` (node_modules, .env, build output) and a `.env.example` at server root.
  - _Requirements: 8.1, 8.2_

- [x] 2. Initialize the backend project and config layer
  - [x] 2.1 Set up `/server` npm project with Express, Mongoose, dotenv, node-cron, multer, nodemailer; configure ES modules and `npm run dev`.
    - _Requirements: 8.1_
  - [x] 2.2 Implement `config/env.js` (load + validate env; fail fast on missing MONGODB_URI, degrade for optional keys) and `config/db.js` (Mongoose connection).
    - _Requirements: 8.1, 8.3_
  - [x] 2.3 Implement `utils/logger.js` and a central `config/matching.js` holding score weights and default threshold.
    - _Requirements: 4.2_

- [x] 3. Implement Mongoose models
  - Create `Profile`, `Preferences`, `Source`, and `Listing` schemas per the design, with the unique index on `Listing.dedupeKey`.
  - _Requirements: 1.3, 2.1, 3.3, 4.1, 5.3_

- [x] 4. Implement resume ingestion
  - [x] 4.1 Add `resumeService` to extract text from an uploaded PDF and parse into structured profile fields (skills, titles, contact, links); leave low-confidence fields empty.
    - _Requirements: 1.1, 1.2_
  - [x] 4.2 Add profile controller + routes: `GET/PUT /api/profile`, `POST /api/profile/resume` (multer upload, type/size validation, reject unsupported formats, preserve manual preferences on re-upload).
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 5. Implement preferences
  - Add preferences controller + routes `GET/PUT /api/preferences`; derive defaults from the profile when unset.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Implement the source adapter framework
  - [x] 6.1 Define the `SourceAdapter` interface and `sourceService` registry that activates adapters only when their env config is present.
    - _Requirements: 3.1, 3.6, 8.3_
  - [x] 6.2 Implement the Remotive adapter (no key required) with `fetch` + `normalize`.
    - _Requirements: 3.1, 3.2_
  - [x] 6.3 Implement the Adzuna and Jooble adapters (disabled without keys) and a generic RSS/Atom adapter.
    - _Requirements: 3.1, 3.2, 3.6_
  - [x] 6.4 Add sources controller + routes `GET /api/sources`, `PUT /api/sources/:key`.
    - _Requirements: 3.1_
  - [x]* 6.5 Unit-test each adapter's `normalize` with mocked responses (no live calls).
    - _Requirements: 3.2_

- [x] 7. Implement the matching engine
  - [x] 7.1 Implement `matchService.score(listing, profile, preferences)` using centralized weights (skill 50%, title 30%, location/remote 20%); clamp to [0,100] and set `isStrongMatch`.
    - _Requirements: 4.1, 4.2, 4.4_
  - [x]* 7.2 Unit-test scoring: bounds [0,100], strong-match consistency, skill-overlap behavior using the base profile as a fixture.
    - _Requirements: 4.1, 4.4_

- [x] 8. Implement the fetch cycle and scheduler
  - [x] 8.1 Implement `fetchService` orchestrating enabled sources: fetch -> normalize -> dedupe (by dedupeKey) -> insert new -> score; per-source errors logged and non-fatal.
    - _Requirements: 3.2, 3.3, 3.4, 4.1_
  - [x] 8.2 Wire `jobs/fetchCycle` with node-cron on `fetchIntervalMinutes`; add `POST /api/fetch/run` for on-demand runs.
    - _Requirements: 3.2_

- [x] 9. Implement listings API
  - Add listings controller + routes: `GET /api/listings` (filter by status/source/minScore, sort by score desc), `GET /api/listings/:id`, `PATCH /api/listings/:id/status`.
  - _Requirements: 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Implement notifications
  - [x] 10.1 Implement `notificationService` (nodemailer email + optional Telegram); no-op when unconfigured.
    - _Requirements: 7.1, 7.2_
  - [x] 10.2 Integrate into the fetch cycle: on new strong match with `notified=false`, send once and set `notified=true`.
    - _Requirements: 7.1, 7.3_

- [x] 11. Implement optional AI document tailoring
  - Implement `documentService` with a provider wrapper; expose `POST /api/listings/:id/tailor` gated on `LLM_API_KEY`; return editable text, never auto-send.
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 12. Add server entrypoint and health endpoint
  - Wire `app.js`/`server.js`: middleware, routes, CORS for client origin, `GET /api/health`, start scheduler after DB connect.
  - _Requirements: 8.3_

- [x] 13. Scaffold the React client
  - [x] 13.1 Initialize `/client` with Vite + React; add `services/api.js` using `VITE_API_URL`.
    - _Requirements: 5.1_
  - [x] 13.2 Build `ProfilePage` (resume upload + view/edit parsed profile).
    - _Requirements: 1.1, 1.3, 1.5_
  - [x] 13.3 Build `PreferencesPage` and `SourcesPage`.
    - _Requirements: 2.1, 2.3, 3.1_
  - [x] 13.4 Build `DashboardPage` (ranked table + filters) and `ListingDetail` (apply link, status control, tailor button when enabled).
    - _Requirements: 4.3, 5.1, 5.2, 5.3, 5.4, 6.1_

- [x] 14. Documentation and final wiring
  - Write `/docs` pages: architecture, adding a legal source, matching rules, configuration/env reference; update README setup steps.
  - Verify `.env.example` lists all keys; confirm no secrets committed.
  - _Requirements: 8.2_

## Task Dependency Graph

```
1 (scaffold)
└── 2 (backend init + config)
    └── 3 (models)
        ├── 4 (resume ingestion)
        ├── 5 (preferences)
        ├── 6 (source adapters) ──┐
        │                         │
        └── 7 (matching) ─────────┤
                                  └── 8 (fetch cycle + scheduler)
                                      ├── 9 (listings API)
                                      ├── 10 (notifications)
                                      └── 11 (AI tailoring, optional)
3,4,5,6,7,8,9,10,11
└── 12 (server entrypoint + health)
    └── 13 (React client)
        └── 14 (docs + final wiring)
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"], "dependsOn": [] },
    { "wave": 2, "tasks": ["2"], "dependsOn": ["1"] },
    { "wave": 3, "tasks": ["3"], "dependsOn": ["2"] },
    { "wave": 4, "tasks": ["4", "5", "6", "7"], "dependsOn": ["3"] },
    { "wave": 5, "tasks": ["8"], "dependsOn": ["6", "7"] },
    { "wave": 6, "tasks": ["9", "10", "11"], "dependsOn": ["8"] },
    { "wave": 7, "tasks": ["12"], "dependsOn": ["9", "10", "11"] },
    { "wave": 8, "tasks": ["13"], "dependsOn": ["12"] },
    { "wave": 9, "tasks": ["14"], "dependsOn": ["13"] }
  ]
}
```

Notes on ordering:
- Tasks 4, 5, 6, 7 depend only on models (task 3) and can proceed in any order.
- Task 8 (fetch cycle) requires both source adapters (6) and matching (7).
- Tasks 9, 10, 11 build on the fetch cycle / listings produced by task 8.
- Task 12 wires everything; task 13 (client) consumes the finished API; task 14 documents.

## Notes

- Follow steering rules: no ToS-violating scraping, no auto-submit, secrets only in env.
- Keep `/docs` and `.env.example` updated as integrations are added (rules.md §3).
- Matching weights/threshold live in `config/matching.js` so rule changes are config edits.
- Optional integrations (Adzuna, Jooble, RSS, LLM, SMTP, Telegram) must degrade gracefully
  when their env config is absent.
- Dev servers are long-running; the user runs `npm run dev` manually in each package.
