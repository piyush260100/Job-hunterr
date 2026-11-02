# Adding a legal job source

New sources must be **legal**: official APIs or public RSS/Atom feeds that permit
programmatic access. Do not add a source that scrapes a platform prohibiting automation
(see `.kiro/steering/rules.md` §1).

## Steps

1. Create `server/src/services/sources/<name>Adapter.js` exporting an adapter object:

   ```js
   import { httpGetJson, normalizedListing } from './adapterBase.js';

   const KEY = 'mysource';

   export const mysourceAdapter = {
     key: KEY,
     label: 'My Source',

     // Return true only if required env config is present (graceful degradation).
     isEnabled(config) {
       return Boolean(config.sources?.mysource?.apiKey);
     },

     async fetch(preferences, config) {
       const data = await httpGetJson('https://api.mysource.example/jobs');
       return data.results || [];
     },

     normalize(raw) {
       return normalizedListing({
         sourceKey: KEY,
         externalId: raw.id,
         title: raw.title,
         company: raw.company,
         location: raw.location,
         remote: Boolean(raw.remote),
         url: raw.url,
         description: raw.description,
         postedAt: raw.postedAt,
       });
     },
   };
   ```

2. Register it in `server/src/services/sourceService.js` by adding it to `ALL_ADAPTERS`.

3. Add any required env vars to `config/env.js` under `sources`, and document them in
   `server/.env.example` and `docs/configuration.md`.

4. Add a unit test in `server/src/services/sources/adapters.test.js` for `normalize`
   using a mocked raw response (no live network calls).

## Why this shape

The fetch orchestrator (`fetchService`) treats every adapter uniformly, so new sources
require no changes to orchestration, matching, dedupe, or the API. The `isEnabled` gate
guarantees a source with missing config is simply skipped.
