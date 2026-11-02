# Project Rules (Hard Constraints)

These rules are non-negotiable and apply to all work on this project. If a requested
change conflicts with a rule here, flag it before proceeding.

## 1. Legal and ToS compliance
- **No scraping of LinkedIn or any platform that prohibits automated access** in its
  Terms of Service.
- **No automated submission of applications** on third-party platforms. The user always
  performs the final "apply" action.
- Job listings are fetched ONLY from sources that permit programmatic access: official
  APIs (Adzuna, Jooble, Remotive, USAJobs, and LinkedIn's official Partner API when
  approved) and public RSS/Atom feeds from company career pages.
- LinkedIn data may be used in-app ONLY via LinkedIn's official Partner API with valid
  credentials. Scraping LinkedIn pages remains forbidden under all circumstances.
- Respect each source's rate limits and API terms.

## 2. Secrets and config
- No secrets (API keys, SMTP creds, tokens) committed to the repo.
- All secrets live in environment variables (`.env`, git-ignored). Provide a
  `.env.example` with key names only.

## 3. Documentation
- Keep documentation current. Update `/docs` and relevant steering files when behavior,
  architecture, or rules change.
- Every new job source, matching rule change, or integration must be documented.

## 4. Code conventions
- Stack: MongoDB, Express, React, Node (MERN). Package manager: npm.
- Backend and frontend live in separate workspaces under one repo.
- Use async/await, not raw promise chains.
- Validate external input (API responses, request bodies) before use.
- Handle errors explicitly; never swallow them silently.

## 5. Changing the rules
- Rule changes are made by editing this steering file (and MCP config where relevant),
  not by hardcoding exceptions in application code.
