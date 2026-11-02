/**
 * LinkedIn adapter — OFFICIAL LinkedIn Partner API only.
 *
 * COMPLIANCE: This adapter does NOT scrape LinkedIn. It calls LinkedIn's official API
 * using OAuth credentials that are issued only after approval in the LinkedIn Partner
 * Program for a jobs product. Until those credentials exist, the adapter is disabled
 * (isEnabled returns false) and the app runs normally without it.
 *
 * Because the exact request/response schema depends on which partner product you are
 * approved for (e.g. Job Search API / Talent Solutions), the request shape and the
 * normalize() mapping below are a reasonable default that you must align with the schema
 * in your approved product's documentation. The places to adjust are marked "ADJUST".
 */
import { normalizedListing } from './adapterBase.js';

const KEY = 'linkedin';

export const linkedinAdapter = {
  key: KEY,
  label: 'LinkedIn (official API)',
  requiresCredentials: true,

  /**
   * Enabled only when all official-API credentials + endpoint are configured.
   * This enforces the legal-source invariant: no credentials => no LinkedIn calls.
   */
  isEnabled(config = {}) {
    const l = config.sources?.linkedin || {};
    return Boolean(l.clientId && l.clientSecret && l.accessToken && l.apiBaseUrl);
  },

  async fetch(preferences = {}, config = {}) {
    const l = config.sources.linkedin;

    const keywords =
      (preferences.titles && preferences.titles[0]) ||
      (preferences.keywords && preferences.keywords[0]) ||
      'developer';
    const location = (preferences.locations && preferences.locations[0]) || '';

    // ADJUST: query params to match your approved jobs-search product.
    const params = new URLSearchParams();
    params.set('keywords', keywords);
    if (location) params.set('location', location);
    params.set('count', '50');

    const url = `${l.apiBaseUrl}?${params.toString()}`;

    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is unavailable; Node 18+ is required.');
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${l.accessToken}`,
        // LinkedIn APIs commonly require a protocol-version header.
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (res.status === 401 || res.status === 403) {
      const err = new Error(
        'LinkedIn API authorization failed. Check LINKEDIN_ACCESS_TOKEN and that your ' +
          'partner app is approved for the jobs product.'
      );
      err.status = res.status;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`LinkedIn API error: HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    // ADJUST: the results array path depends on the product (e.g. data.elements).
    return Array.isArray(data.elements)
      ? data.elements
      : Array.isArray(data.jobs)
      ? data.jobs
      : [];
  },

  /**
   * ADJUST: map your approved product's job object to the normalized shape. The
   * defensive fallbacks below cover common LinkedIn field names so it degrades sensibly
   * if a field is missing.
   */
  normalize(raw = {}) {
    const title = raw.title || raw.jobTitle || raw.name || '';
    const company =
      raw.companyName ||
      raw.company?.name ||
      raw.companyDetails?.name ||
      '';
    const location =
      raw.formattedLocation || raw.location?.displayName || raw.location || '';
    const url =
      raw.jobPostingUrl ||
      raw.applyUrl ||
      (raw.entityUrn ? `https://www.linkedin.com/jobs/view/${extractId(raw.entityUrn)}` : '');
    const externalId = raw.id || extractId(raw.entityUrn) || '';
    const description =
      raw.description?.text || raw.descriptionText || raw.description || '';
    const postedAt = raw.listedAt
      ? new Date(Number(raw.listedAt))
      : raw.postedAt || null;
    const remote = /remote/i.test(`${title} ${location} ${description}`);

    return normalizedListing({
      sourceKey: KEY,
      externalId,
      title,
      company,
      location,
      remote,
      url,
      description,
      postedAt,
    });
  },
};

/** Pull the numeric id from a LinkedIn URN like "urn:li:jobPosting:123456". */
function extractId(urn) {
  if (!urn) return '';
  const parts = String(urn).split(':');
  return parts[parts.length - 1] || '';
}
