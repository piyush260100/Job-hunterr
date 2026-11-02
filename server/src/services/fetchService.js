/**
 * Fetch orchestration.
 *
 * For each active (env-enabled + user-enabled) adapter:
 *   fetch -> normalize -> dedupe -> insert new -> score.
 * Per-source errors are caught, logged, recorded on the Source doc, and never abort
 * the overall cycle (requirement 3.4 / design Property 6). Deduping by dedupeKey
 * guarantees no duplicate listings (Property 1).
 *
 * Strong-match notification is delegated to a callback so this module stays
 * decoupled from the notification channel (wired in the scheduler, task 10.2).
 */
import { config } from '../config/env.js';
import { Listing } from '../models/Listing.js';
import { Source } from '../models/Source.js';
import { getActiveAdapters } from './sourceService.js';
import { getOrCreateProfile } from './profileService.js';
import { getOrCreatePreferences } from './preferencesService.js';
import { score } from './matchService.js';
import { makeDedupeKey } from '../utils/dedupe.js';
import { logger } from '../utils/logger.js';

async function recordSourceStatus(key, status) {
  await Source.findOneAndUpdate(
    { key },
    { $set: { lastStatus: status, lastFetchedAt: new Date() } },
    { upsert: true }
  );
}

/**
 * Run one full fetch cycle.
 * @param {(listing) => Promise<void>} [onStrongMatch] called once per new strong match.
 * @returns {Promise<{inserted:number, strongMatches:number, perSource:object}>}
 */
export async function runFetchCycle(onStrongMatch, cfg = config) {
  const profile = await getOrCreateProfile();
  const preferences = await getOrCreatePreferences();
  const adapters = await getActiveAdapters(cfg);

  const summary = { inserted: 0, strongMatches: 0, perSource: {} };

  for (const adapter of adapters) {
    try {
      const rawList = await adapter.fetch(preferences, cfg);
      let insertedForSource = 0;

      for (const raw of rawList) {
        const normalized = adapter.normalize(raw);
        if (!normalized.url && !normalized.externalId) continue; // unusable

        const dedupeKey = makeDedupeKey(
          normalized.sourceKey,
          normalized.externalId,
          normalized.url
        );

        // Skip if already stored (dedupe invariant).
        const exists = await Listing.exists({ dedupeKey });
        if (exists) continue;

        const { score: matchScore, isStrongMatch } = score(
          normalized,
          profile,
          preferences
        );

        const doc = await Listing.create({
          ...normalized,
          dedupeKey,
          matchScore,
          isStrongMatch,
          fetchedAt: new Date(),
        });

        insertedForSource += 1;
        summary.inserted += 1;

        if (isStrongMatch) {
          summary.strongMatches += 1;
          if (typeof onStrongMatch === 'function') {
            try {
              await onStrongMatch(doc);
            } catch (notifyErr) {
              logger.warn(
                `Notification failed for listing ${doc._id}: ${notifyErr.message}`
              );
            }
          }
        }
      }

      summary.perSource[adapter.key] = { inserted: insertedForSource, status: 'ok' };
      await recordSourceStatus(adapter.key, 'ok');
    } catch (err) {
      const status = err.status === 429 ? 'rate_limited' : 'error';
      summary.perSource[adapter.key] = { inserted: 0, status };
      logger.error(`Source "${adapter.key}" failed: ${err.message}`);
      await recordSourceStatus(adapter.key, status);
      // Continue with other sources.
    }
  }

  logger.info(
    `Fetch cycle complete: ${summary.inserted} new, ${summary.strongMatches} strong matches`
  );
  return summary;
}
