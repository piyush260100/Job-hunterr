/**
 * Listing queries, status updates, and manual (user-saved) listings.
 */
import { Listing, LISTING_STATUSES } from '../models/Listing.js';
import { makeDedupeKey } from '../utils/dedupe.js';
import { score } from './matchService.js';
import { getOrCreateProfile } from './profileService.js';
import { getOrCreatePreferences } from './preferencesService.js';

/**
 * Query listings with optional filters, always sorted by match score descending
 * (requirement 4.3).
 * @param {{status?:string, source?:string, minScore?:number, limit?:number}} filters
 */
export async function queryListings(filters = {}) {
  const q = {};
  if (filters.status) q.status = filters.status;
  if (filters.source) q.sourceKey = filters.source;
  if (filters.minScore !== undefined && filters.minScore !== '') {
    const n = Number(filters.minScore);
    if (!Number.isNaN(n)) q.matchScore = { $gte: n };
  }

  const limit = Math.min(Number(filters.limit) || 200, 500);
  return Listing.find(q).sort({ matchScore: -1, fetchedAt: -1 }).limit(limit);
}

export async function getListingById(id) {
  return Listing.findById(id);
}

/**
 * Save a job the user found manually (e.g. on LinkedIn) by its URL plus a few
 * optional fields. The listing is scored against the profile, deduped, and tracked
 * like any fetched listing. This is the assisted-apply path: the user discovers and
 * applies; the app just captures and organizes. No scraping is performed here.
 *
 * @param {{url:string, title?:string, company?:string, location?:string,
 *          remote?:boolean, description?:string}} input
 */
export async function saveManualListing(input = {}) {
  const url = String(input.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    const err = new Error('A valid job URL (http/https) is required.');
    err.status = 400;
    throw err;
  }

  const sourceKey = detectSource(url);
  const dedupeKey = makeDedupeKey(sourceKey, '', url);

  // If already saved/fetched, return the existing record (dedupe invariant).
  const existing = await Listing.findOne({ dedupeKey });
  if (existing) return existing;

  const normalized = {
    sourceKey,
    externalId: '',
    title: String(input.title || '').trim(),
    company: String(input.company || '').trim(),
    location: String(input.location || '').trim(),
    remote: Boolean(input.remote),
    url,
    description: String(input.description || '').trim(),
    postedAt: null,
  };

  const profile = await getOrCreateProfile();
  const preferences = await getOrCreatePreferences();
  const { score: matchScore, isStrongMatch } = score(normalized, profile, preferences);

  return Listing.create({
    ...normalized,
    dedupeKey,
    matchScore,
    isStrongMatch,
    status: 'saved', // user explicitly saved it
    fetchedAt: new Date(),
  });
}

/** Label the source from the URL host (purely descriptive). */
function detectSource(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('linkedin.com')) return 'linkedin-manual';
    return `manual:${host}`;
  } catch {
    return 'manual';
  }
}

export async function updateListingStatus(id, status) {
  if (!LISTING_STATUSES.includes(status)) {
    const err = new Error(
      `Invalid status "${status}". Allowed: ${LISTING_STATUSES.join(', ')}`
    );
    err.status = 400;
    throw err;
  }
  const doc = await Listing.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  );
  if (!doc) {
    const err = new Error('Listing not found');
    err.status = 404;
    throw err;
  }
  return doc;
}
