/**
 * Jooble adapter — official API (POST with JSON body). Requires JOOBLE_API_KEY.
 * Disabled automatically when the key is absent.
 * Docs: https://jooble.org/api/about
 */
import { normalizedListing } from './adapterBase.js';

const KEY = 'jooble';

export const joobleAdapter = {
  key: KEY,
  label: 'Jooble',
  requiresCredentials: true,

  isEnabled(config = {}) {
    return Boolean(config.sources?.jooble?.apiKey);
  },

  async fetch(preferences = {}, config = {}) {
    const apiKey = config.sources.jooble.apiKey;
    const keywords =
      (preferences.titles && preferences.titles[0]) ||
      (preferences.keywords && preferences.keywords[0]) ||
      'developer';
    const location = (preferences.locations && preferences.locations[0]) || '';

    if (typeof fetch !== 'function') {
      throw new Error('Global fetch is unavailable; Node 18+ is required.');
    }

    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location }),
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} from Jooble`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return Array.isArray(data.jobs) ? data.jobs : [];
  },

  normalize(raw) {
    return normalizedListing({
      sourceKey: KEY,
      externalId: raw.id,
      title: raw.title,
      company: raw.company,
      location: raw.location,
      remote: /remote/i.test(`${raw.title} ${raw.snippet} ${raw.location}`),
      url: raw.link,
      description: raw.snippet,
      postedAt: raw.updated,
    });
  },
};
