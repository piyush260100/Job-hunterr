import { describe, it, expect } from 'vitest';
import { remotiveAdapter } from './remotiveAdapter.js';
import { adzunaAdapter } from './adzunaAdapter.js';
import { joobleAdapter } from './joobleAdapter.js';
import { rssAdapter } from './rssAdapter.js';
import { linkedinAdapter } from './linkedinAdapter.js';

describe('remotiveAdapter.normalize', () => {
  it('maps a raw Remotive job to the normalized shape', () => {
    const raw = {
      id: 123,
      title: 'Senior Full Stack Engineer',
      company_name: 'Acme',
      candidate_required_location: 'Worldwide',
      url: 'https://remotive.com/job/123',
      description: '<p>Build <b>things</b> with React &nbsp; and Node</p>',
      publication_date: '2026-10-01',
    };
    const n = remotiveAdapter.normalize(raw);
    expect(n.sourceKey).toBe('remotive');
    expect(n.externalId).toBe('123');
    expect(n.title).toBe('Senior Full Stack Engineer');
    expect(n.company).toBe('Acme');
    expect(n.remote).toBe(true);
    expect(n.url).toBe('https://remotive.com/job/123');
    expect(n.description).toBe('Build things with React and Node');
    expect(n.postedAt).toBeInstanceOf(Date);
  });

  it('is always enabled (no key required)', () => {
    expect(remotiveAdapter.isEnabled()).toBe(true);
  });
});

describe('adzunaAdapter', () => {
  it('normalizes a raw Adzuna result', () => {
    const raw = {
      id: 'az-1',
      title: 'Backend Developer (Remote)',
      company: { display_name: 'Globex' },
      location: { display_name: 'Bengaluru' },
      redirect_url: 'https://adzuna.example/az-1',
      description: 'Node and Mongo, remote friendly',
      created: '2026-09-15',
    };
    const n = adzunaAdapter.normalize(raw);
    expect(n.sourceKey).toBe('adzuna');
    expect(n.company).toBe('Globex');
    expect(n.location).toBe('Bengaluru');
    expect(n.remote).toBe(true); // "Remote" in title
    expect(n.url).toBe('https://adzuna.example/az-1');
  });

  it('is disabled without app id/key', () => {
    expect(adzunaAdapter.isEnabled({ sources: { adzuna: {} } })).toBe(false);
    expect(
      adzunaAdapter.isEnabled({ sources: { adzuna: { appId: 'x', appKey: 'y' } } })
    ).toBe(true);
  });
});

describe('joobleAdapter', () => {
  it('normalizes a raw Jooble job', () => {
    const raw = {
      id: 42,
      title: 'MERN Developer',
      company: 'Initech',
      location: 'Remote',
      link: 'https://jooble.example/42',
      snippet: 'React, Express, MongoDB',
      updated: '2026-10-10',
    };
    const n = joobleAdapter.normalize(raw);
    expect(n.sourceKey).toBe('jooble');
    expect(n.externalId).toBe('42');
    expect(n.remote).toBe(true);
  });

  it('is disabled without an api key', () => {
    expect(joobleAdapter.isEnabled({ sources: { jooble: {} } })).toBe(false);
    expect(joobleAdapter.isEnabled({ sources: { jooble: { apiKey: 'k' } } })).toBe(true);
  });
});

describe('rssAdapter', () => {
  it('normalizes an RSS item', () => {
    const raw = {
      guid: 'g-1',
      title: 'Full Stack Engineer - Remote',
      link: 'https://careers.example/1',
      contentSnippet: 'We use the MERN stack.',
      isoDate: '2026-10-20T00:00:00.000Z',
      __feedTitle: 'Example Careers',
    };
    const n = rssAdapter.normalize(raw);
    expect(n.sourceKey).toBe('rss');
    expect(n.externalId).toBe('g-1');
    expect(n.company).toBe('Example Careers');
    expect(n.remote).toBe(true);
  });

  it('is disabled without feed urls', () => {
    expect(rssAdapter.isEnabled({ sources: { rss: { feedUrls: [] } } })).toBe(false);
    expect(
      rssAdapter.isEnabled({ sources: { rss: { feedUrls: ['https://x/feed'] } } })
    ).toBe(true);
  });
});

describe('linkedinAdapter (official API)', () => {
  it('is disabled unless all official-API credentials are present', () => {
    expect(linkedinAdapter.isEnabled({ sources: { linkedin: {} } })).toBe(false);
    expect(
      linkedinAdapter.isEnabled({
        sources: { linkedin: { clientId: 'a', clientSecret: 'b', accessToken: 'c' } },
      })
    ).toBe(false); // missing apiBaseUrl
    expect(
      linkedinAdapter.isEnabled({
        sources: {
          linkedin: {
            clientId: 'a',
            clientSecret: 'b',
            accessToken: 'c',
            apiBaseUrl: 'https://api.linkedin.com/v2/jobSearch',
          },
        },
      })
    ).toBe(true);
  });

  it('normalizes an official LinkedIn job object (elements shape)', () => {
    const raw = {
      entityUrn: 'urn:li:jobPosting:987654',
      title: 'Senior Full Stack Engineer (Remote)',
      companyName: 'Acme',
      formattedLocation: 'Bengaluru, India',
      jobPostingUrl: 'https://www.linkedin.com/jobs/view/987654',
      descriptionText: 'React, Node.js, remote-friendly',
      listedAt: 1730000000000,
    };
    const n = linkedinAdapter.normalize(raw);
    expect(n.sourceKey).toBe('linkedin');
    expect(n.externalId).toBe('987654');
    expect(n.title).toBe('Senior Full Stack Engineer (Remote)');
    expect(n.company).toBe('Acme');
    expect(n.location).toBe('Bengaluru, India');
    expect(n.url).toBe('https://www.linkedin.com/jobs/view/987654');
    expect(n.remote).toBe(true);
    expect(n.postedAt).toBeInstanceOf(Date);
  });

  it('derives the view URL from the URN when no explicit url is given', () => {
    const n = linkedinAdapter.normalize({ entityUrn: 'urn:li:jobPosting:111', title: 'Dev' });
    expect(n.url).toBe('https://www.linkedin.com/jobs/view/111');
    expect(n.externalId).toBe('111');
  });
});
