# Primary workflow: portal search + manual save

On networks where the automated job-source APIs are blocked (e.g. a Cisco Secure
Access security policy returning HTTP 403), the app's primary workflow is the
assisted "Find jobs + Save by URL" flow. Nothing is scraped and you always apply
yourself.

## How it works

1. **Set preferences** (Preferences page): target titles, keywords, location, remote.
2. **Search jobs on LinkedIn** (Dashboard → "Search jobs on LinkedIn" panel): enter a role
   and filters (date posted, workplace, experience level, job type, min experience,
   min salary, Easy Apply, sort), then click Search. It opens the exact LinkedIn search
   in your own browser session, where you are logged in. You can also save filter
   combinations as presets and re-run them with one click.

   Notes on two filters:
   - **Min salary** uses LinkedIn's salary buckets, which are **USD-based** and only
     apply where a posting carries structured salary data. Many India/INR jobs lack
     this, so setting it can greatly reduce results.
   - **Min experience (years)** has no native LinkedIn URL filter, so the value is added
     to your keywords as "N+ years" to bias results. Combine it with the Experience
     level filter for better targeting.
3. **Browse and apply** on LinkedIn yourself.
4. **Save a job to track**: paste the posting's URL (plus optional title/company/location)
   into the "Save a job to track" box. The app detects the portal, scores the job against
   your profile, dedupes it, and tracks it with status `saved`.
5. **Track**: use the "Tracked jobs" table to filter by status/score and update status
   (saved → applied → interview, etc.); open the apply link again from the listing
   detail page.
6. **Optional tailoring**: if an LLM key is configured, generate and download a tailored
   resume and cover letter from the listing detail page.

## Why there is no automated "Fetch now"

The automated fetchers (Remotive, Adzuna, Jooble) require outbound HTTPS to those APIs.
On a network with a blocking security policy (e.g. Cisco Secure Access returning HTTP
403), those requests fail and no client-side change can bypass it. Because this does not
work on the target network, the automated-fetch UI (the "Fetch now" button, source
toggles, and the connectivity panel) has been **removed from the dashboard** to keep it
focused on what works: LinkedIn search + save-and-track.

The backend fetch/source/diagnostics endpoints still exist and can be re-enabled by
re-adding their UI if you later run the server on an unrestricted network. To enable
automated fetching there, either:

- Ask IT to allow-list `remotive.com`, `api.adzuna.com`, `jooble.org`, or
- Run the server off the restricted network.

See `docs/configuration.md` for the `NODE_EXTRA_CA_CERTS` setting (fixes TLS interception,
though it cannot bypass an outright policy block).

## Entering list fields (skills, titles, locations, keywords)

These fields accept multiple values separated by commas, for example:

```
React, Node.js, MongoDB, Express
Full Stack Developer, Backend Engineer
Bengaluru, Remote
```

Type freely, commas and spaces are allowed as you go. The text is parsed into a list
only when you click **Save** (splitting on commas or new lines, trimming each entry).
Individual values may contain spaces (e.g. "Full Stack Developer"). Empty entries are
ignored.

## Relevant endpoints

- `GET /api/listings/portal-search?datePosted=day|week|month` — portal search URLs.
- `GET /api/listings/linkedin-search?datePosted=...` — LinkedIn-only search URL.
- `POST /api/listings/manual` — save a job by URL (scored, deduped, tracked).
