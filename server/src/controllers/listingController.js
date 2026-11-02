import {
  queryListings,
  getListingById,
  updateListingStatus,
  saveManualListing,
} from '../services/listingService.js';
import { generateTailoredDocs, isTailoringEnabled } from '../services/documentService.js';
import {
  buildLinkedInSearchUrl,
  buildPortalSearchUrls,
  buildLinkedInSearchFromQuery,
  LINKEDIN_FILTER_OPTIONS,
  LINKEDIN_FILTER_NOTES,
} from '../utils/linkedinSearch.js';
import { getOrCreatePreferences } from '../services/preferencesService.js';

export async function getListings(req, res, next) {
  try {
    const { status, source, minScore, limit } = req.query;
    const listings = await queryListings({ status, source, minScore, limit });
    res.json(listings);
  } catch (err) {
    next(err);
  }
}

export async function getListing(req, res, next) {
  try {
    const listing = await getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: { message: 'Listing not found' } });
    }
    res.json(listing);
  } catch (err) {
    next(err);
  }
}

export async function patchListingStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    const listing = await updateListingStatus(req.params.id, status);
    res.json(listing);
  } catch (err) {
    next(err);
  }
}

/**
 * Return a LinkedIn jobs search deep-link built from the user's preferences.
 * The client opens this in the user's own browser (no scraping, no API call).
 */
export async function linkedinSearchUrl(req, res, next) {
  try {
    const preferences = await getOrCreatePreferences();
    const datePosted = req.query.datePosted || 'day';
    const url = buildLinkedInSearchUrl(preferences, { datePosted });
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

/** Return the available LinkedIn filter options (and notes) for the search form. */
export function linkedinFilterOptions(req, res) {
  res.json({ options: LINKEDIN_FILTER_OPTIONS, notes: LINKEDIN_FILTER_NOTES });
}

/** Build a LinkedIn search URL from an explicit role + filters payload. */
export function buildSearch(req, res, next) {
  try {
    const url = buildLinkedInSearchFromQuery(req.body || {});
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

/** Return search deep-links for several job portals, built from preferences. */
export async function portalSearchUrls(req, res, next) {
  try {
    const preferences = await getOrCreatePreferences();
    const datePosted = req.query.datePosted || 'day';
    const portals = buildPortalSearchUrls(preferences, { datePosted });
    res.json({ portals });
  } catch (err) {
    next(err);
  }
}

/** Save a job the user found manually (e.g. on LinkedIn) by URL. */
export async function saveManual(req, res, next) {
  try {
    const listing = await saveManualListing(req.body || {});
    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
}

export async function tailorListing(req, res, next) {
  try {
    if (!isTailoringEnabled()) {
      return res.status(400).json({
        error: { message: 'Document tailoring is not configured (no LLM API key).' },
      });
    }
    const listing = await getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: { message: 'Listing not found' } });
    }
    const docs = await generateTailoredDocs(listing);
    listing.tailoredDocs = docs;
    await listing.save();
    res.json(listing);
  } catch (err) {
    next(err);
  }
}
