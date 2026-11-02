# LinkedIn via the official API (compliant in-app fetching)

This is the ONLY legitimate way to fetch LinkedIn job data into the app and display it
natively (no scraping). It requires approval from LinkedIn and OAuth credentials. Until
those exist, the LinkedIn source is automatically disabled and the app runs normally.

> Scraping LinkedIn is never done by this app and is forbidden by `.kiro/steering/rules.md`
> §1. The adapter below calls LinkedIn's official API only.

## What you need (one-time, done by you)

1. **Create a LinkedIn Developer app**: https://www.linkedin.com/developers/apps
2. **Apply to the LinkedIn Partner Program** for a jobs product. Job search/listing data
   is gated; general developer apps do NOT get it by default. You must be approved for a
   product such as Talent Solutions / Job Search. This approval is granted by LinkedIn
   and can take time; individual approval is often hard to obtain.
3. Once approved, from your app you get:
   - Client ID and Client Secret
   - An OAuth access token with the approved scopes
   - The API base URL for the approved jobs-search endpoint

## Configure the app

Add to `server/.env` (all four required; absent => source stays disabled):

```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_API_BASE_URL=https://api.linkedin.com/v2/<approved-jobs-endpoint>
```

Restart the server (it reads env at startup). On the dashboard, a "Connected job sources"
panel appears with a **Fetch jobs now** button. Fetched jobs are stored, scored against
your profile, and displayed in the "Tracked jobs" table, no redirect to LinkedIn.

## Aligning the adapter to your approved product

The exact request params and response schema depend on which jobs product you are
approved for. In `server/src/services/sources/linkedinAdapter.js`, the spots marked
`ADJUST` are where you align:

- `fetch()` query parameters (keywords/location/count naming).
- The results array path (e.g. `data.elements`).
- `normalize()` field mapping (title, company, location, url, description, postedAt).

The defaults use common LinkedIn field names and degrade gracefully, but confirm them
against your product's reference docs.

## Notes

- The OAuth access token expires. For production, implement a refresh flow using the
  client id/secret; the current adapter uses a provided access token directly.
- On a network that blocks `api.linkedin.com` (e.g. a security policy returning 403),
  fetching will fail there regardless of credentials. Run the server where the official
  API host is reachable.
