/**
 * Scheduled fetch cycle.
 *
 * Runs runFetchCycle on an interval derived from preferences.fetchIntervalMinutes.
 * On each new strong match, sends a notification exactly once and marks the listing
 * notified=true (requirement 7.3 / Property 4).
 */
import cron from 'node-cron';
import { runFetchCycle } from '../services/fetchService.js';
import { notifyStrongMatch, anyChannelConfigured } from '../services/notificationService.js';
import { getOrCreatePreferences } from '../services/preferencesService.js';
import { Listing } from '../models/Listing.js';
import { logger } from '../utils/logger.js';

let task = null;

/** Notification callback: send once, then flip the notified flag. */
async function handleStrongMatch(listing) {
  if (listing.notified) return; // already handled
  if (!anyChannelConfigured()) {
    // No channel: listing stays in dashboard only. Do not mark notified so that
    // configuring a channel later still allows a future alert if desired.
    return;
  }
  await notifyStrongMatch(listing);
  listing.notified = true;
  await Listing.updateOne({ _id: listing._id }, { $set: { notified: true } });
}

/** Run a single cycle on demand (used by POST /api/fetch/run and the scheduler). */
export async function runCycleNow() {
  return runFetchCycle(handleStrongMatch);
}

/**
 * Start the cron scheduler. Interval is read from preferences at start; if it
 * changes, the scheduler is restarted by calling startScheduler again.
 */
export async function startScheduler() {
  const prefs = await getOrCreatePreferences();
  const minutes = Math.max(1, prefs.fetchIntervalMinutes || 15);
  const expression = `*/${minutes} * * * *`;

  if (task) {
    task.stop();
    task = null;
  }

  task = cron.schedule(expression, async () => {
    try {
      await runCycleNow();
    } catch (err) {
      logger.error(`Scheduled fetch cycle error: ${err.message}`);
    }
  });

  logger.info(`Fetch scheduler started (every ${minutes} min).`);
  return task;
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    logger.info('Fetch scheduler stopped.');
  }
}
