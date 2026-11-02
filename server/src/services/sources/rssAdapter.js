/**
 * Generic RSS/Atom adapter for company career feeds. Legal: public feeds that are
 * explicitly published for syndication. Enabled when RSS_FEED_URLS is configured.
 */
import Parser from 'rss-parser';
import { normalizedListing } from './adapterBase.js';

const KEY = 'rss';
const parser = new Parser();

export const rssAdapter = {
  key: KEY,
  label: 'Company RSS/Atom feeds',
  requiresCredentials: true, // needs configured feed URLs

  isEnabled(config = {}) {
    const urls = config.sources?.rss?.feedUrls || [];
    return urls.length > 0;
  },

  async fetch(preferences = {}, config = {}) {
    const urls = config.sources?.rss?.feedUrls || [];
    const all = [];
    for (const url of urls) {
      try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items || []) {
          all.push({ ...item, __feedTitle: feed.title });
        }
      } catch {
        // Skip a single bad feed; the orchestrator logs per-source status.
      }
    }
    return all;
  },

  normalize(raw) {
    const text = `${raw.title || ''} ${raw.contentSnippet || raw.content || ''}`;
    return normalizedListing({
      sourceKey: KEY,
      externalId: raw.guid || raw.link,
      title: raw.title,
      company: raw.__feedTitle || '',
      location: '',
      remote: /remote/i.test(text),
      url: raw.link,
      description: raw.contentSnippet || raw.content || '',
      postedAt: raw.isoDate || raw.pubDate,
    });
  },
};
