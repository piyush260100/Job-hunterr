/**
 * Adzuna adapter — official API. Requires ADZUNA_APP_ID and ADZUNA_APP_KEY.
 * Disabled automatically when those are absent (requirement 3.6 / 8.3).
 * Docs: https://developer.adzuna.com/
 */
import { httpGetJson, normalizedListing } from './adapterBase.js';

const KEY = 'adzuna';

export const adzunaAdapter = {
  key: KEY,
  label: 'Adzuna',
  requiresCredentials: true,

  isEnabled(config = {}) {
    const a = config.sources?.adzuna || {};
    return Boolean(a.appId && a.appKey);
  },

  async fetch(preferences = {}, config = {}) {
    const a = config.sources?.adzuna || {};
    const country = a.country || 'in';
    const what =
      (preferences.titles && preferences.titles[0]) ||
      (preferences.keywords && preferences.keywords[0]) ||
      'developer';
    const where = (preferences.locations && preferences.locations[0]) || '';

    const params = new URLSearchParams({
      app_id: a.appId,
      app_key: a.appKey,
      results_per_page: '50',
      what,
      content_type: 'application/json',
    });
    if (where) params.set('where', where);

    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;
    const data = await httpGetJson(url);
    return Array.isArray(data.results) ? data.results : [];
  },

  normalize(raw) {
    return normalizedListing({
      sourceKey: KEY,
      externalId: raw.id,
      title: raw.title,
      company: raw.company?.display_name,
      location: raw.location?.display_name,
      remote: /remote/i.test(`${raw.title} ${raw.description}`),
      url: raw.redirect_url,
      description: raw.description,
      postedAt: raw.created,
    });
  },
};
