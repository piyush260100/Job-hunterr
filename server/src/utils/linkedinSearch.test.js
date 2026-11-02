import { describe, it, expect } from 'vitest';
import {
  buildLinkedInSearchUrl,
  buildPortalSearchUrls,
  buildLinkedInSearchFromQuery,
} from './linkedinSearch.js';

describe('buildLinkedInSearchUrl', () => {
  it('builds a valid LinkedIn jobs search URL from preferences', () => {
    const url = buildLinkedInSearchUrl(
      { titles: ['Full Stack Developer'], locations: ['Bengaluru'], remote: true },
      { datePosted: 'day' }
    );
    const parsed = new URL(url);
    expect(parsed.hostname).toBe('www.linkedin.com');
    expect(parsed.pathname).toBe('/jobs/search/');
    expect(parsed.searchParams.get('keywords')).toBe('Full Stack Developer');
    expect(parsed.searchParams.get('location')).toBe('Bengaluru');
    expect(parsed.searchParams.get('f_TPR')).toBe('r86400'); // past 24h
    expect(parsed.searchParams.get('f_WT')).toBe('2'); // remote
    expect(parsed.searchParams.get('sortBy')).toBe('DD');
  });

  it('falls back to a default keyword and omits remote when not set', () => {
    const url = buildLinkedInSearchUrl({}, { datePosted: 'week' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('keywords')).toBe('developer');
    expect(parsed.searchParams.get('f_TPR')).toBe('r604800');
    expect(parsed.searchParams.get('f_WT')).toBeNull();
  });
});

describe('buildPortalSearchUrls', () => {
  const prefs = { titles: ['Full Stack Developer'], locations: ['Bengaluru'], remote: true };

  it('returns search URLs for all supported portals', () => {
    const portals = buildPortalSearchUrls(prefs, { datePosted: 'day' });
    const keys = portals.map((p) => p.key);
    expect(keys).toEqual(['linkedin', 'naukri', 'indeed', 'wellfound']);
    for (const p of portals) {
      expect(() => new URL(p.url)).not.toThrow();
      expect(p.url).toMatch(/^https:\/\//);
    }
  });

  it('builds a Naukri slug path from the keyword and location', () => {
    const portals = buildPortalSearchUrls(prefs);
    const naukri = portals.find((p) => p.key === 'naukri');
    expect(naukri.url).toContain('full-stack-developer-jobs');
    expect(naukri.url).toContain('-in-bengaluru');
  });

  it('encodes the Indeed query and location', () => {
    const portals = buildPortalSearchUrls(prefs);
    const indeed = portals.find((p) => p.key === 'indeed');
    const u = new URL(indeed.url);
    expect(u.searchParams.get('q')).toBe('Full Stack Developer');
    expect(u.searchParams.get('l')).toBe('Bengaluru');
  });
});

describe('buildLinkedInSearchFromQuery', () => {
  it('maps role, location, and all filters to LinkedIn query params', () => {
    const url = buildLinkedInSearchFromQuery({
      role: 'Senior Full Stack Developer',
      location: 'Bengaluru',
      datePosted: 'week',
      workplace: ['remote', 'hybrid'],
      experience: ['mid_senior', 'associate'],
      jobType: ['fulltime', 'contract'],
      easyApply: true,
      sort: 'relevance',
    });
    const u = new URL(url);
    expect(u.searchParams.get('keywords')).toBe('Senior Full Stack Developer');
    expect(u.searchParams.get('location')).toBe('Bengaluru');
    expect(u.searchParams.get('f_TPR')).toBe('r604800');
    expect(u.searchParams.get('f_WT')).toBe('2,3'); // remote, hybrid
    expect(u.searchParams.get('f_E')).toBe('4,3'); // mid_senior, associate
    expect(u.searchParams.get('f_JT')).toBe('F,C'); // fulltime, contract
    expect(u.searchParams.get('f_AL')).toBe('true'); // easy apply
    expect(u.searchParams.get('sortBy')).toBe('R'); // relevance
  });

  it('defaults keyword and sort, omits unset filters', () => {
    const url = buildLinkedInSearchFromQuery({ datePosted: 'any' });
    const u = new URL(url);
    expect(u.searchParams.get('keywords')).toBe('developer');
    expect(u.searchParams.get('f_TPR')).toBeNull();
    expect(u.searchParams.get('f_WT')).toBeNull();
    expect(u.searchParams.get('f_SB2')).toBeNull();
    expect(u.searchParams.get('sortBy')).toBe('DD'); // default date
  });

  it('maps a minimum salary bucket to f_SB2', () => {
    const url = buildLinkedInSearchFromQuery({ role: 'developer', minSalary: '100k' });
    expect(new URL(url).searchParams.get('f_SB2')).toBe('4');
  });

  it('ignores an unknown salary bucket', () => {
    const url = buildLinkedInSearchFromQuery({ role: 'developer', minSalary: 'banana' });
    expect(new URL(url).searchParams.get('f_SB2')).toBeNull();
  });

  it('folds minimum experience years into the keywords', () => {
    const url = buildLinkedInSearchFromQuery({ role: 'Backend Engineer', minExperienceYears: 5 });
    expect(new URL(url).searchParams.get('keywords')).toBe('Backend Engineer 5+ years');
  });

  it('ignores zero or invalid experience years', () => {
    const u0 = new URL(buildLinkedInSearchFromQuery({ role: 'Dev', minExperienceYears: 0 }));
    expect(u0.searchParams.get('keywords')).toBe('Dev');
    const uX = new URL(buildLinkedInSearchFromQuery({ role: 'Dev', minExperienceYears: 'abc' }));
    expect(uX.searchParams.get('keywords')).toBe('Dev');
  });
});
