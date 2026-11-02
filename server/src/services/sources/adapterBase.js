/**
 * Source adapter contract.
 *
 * Every legal job source implements this shape so the fetch orchestrator can treat
 * them uniformly and new sources plug in without touching orchestration code.
 *
 * An adapter is a plain object:
 * {
 *   key: string,                         // e.g. "remotive"
 *   label: string,                       // human-readable
 *   isEnabled(config) => boolean,        // true only if required env config present
 *   fetch(preferences, config) => Promise<RawListing[]>,
 *   normalize(raw) => NormalizedListing,
 * }
 *
 * NormalizedListing = {
 *   sourceKey, externalId, title, company, location, remote, url, description, postedAt
 * }
 *
 * LEGAL CONSTRAINT: adapters may only target sources that permit programmatic
 * access (official APIs / public RSS). No adapter may scrape a platform that
 * prohibits automated access (see .kiro/steering/rules.md §1).
 */

/** Node 18+ has global fetch; wrap for a clear error if unavailable. */
export async function httpGetJson(url, options = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable; Node 18+ is required.');
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Build a normalized listing with safe defaults. */
export function normalizedListing(partial = {}) {
  return {
    sourceKey: partial.sourceKey || '',
    externalId: partial.externalId ? String(partial.externalId) : '',
    title: partial.title || '',
    company: partial.company || '',
    location: partial.location || '',
    remote: Boolean(partial.remote),
    url: partial.url || '',
    description: partial.description || '',
    postedAt: partial.postedAt ? new Date(partial.postedAt) : null,
  };
}
