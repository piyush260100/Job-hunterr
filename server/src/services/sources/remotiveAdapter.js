/**
 * Remotive adapter — public remote-jobs API, no API key required.
 * Docs: https://remotive.com/api/remote-jobs  (public, permits programmatic access)
 */
import { httpGetJson, normalizedListing } from './adapterBase.js';

const KEY = 'remotive';
const BASE = 'https://remotive.com/api/remote-jobs';

export const remotiveAdapter = {
  key: KEY,
  label: 'Remotive (remote jobs)',
  requiresCredentials: false, // keyless public API

  // No key needed; always available.
  isEnabled() {
    return true;
  },

  async fetch(preferences = {}) {
    // Use the first preference title/keyword as the search term if present.
    const term =
      (preferences.titles && preferences.titles[0]) ||
      (preferences.keywords && preferences.keywords[0]) ||
      '';
    const params = new URLSearchParams();
    if (term) params.set('search', term);
    params.set('limit', '50');
    const url = `${BASE}?${params.toString()}`;
    const data = await httpGetJson(url);
    return Array.isArray(data.jobs) ? data.jobs : [];
  },

  normalize(raw) {
    return normalizedListing({
      sourceKey: KEY,
      externalId: raw.id,
      title: raw.title,
      company: raw.company_name,
      location: raw.candidate_required_location || 'Remote',
      remote: true,
      url: raw.url,
      description: stripHtml(raw.description),
      postedAt: raw.publication_date,
    });
  },
};

function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
