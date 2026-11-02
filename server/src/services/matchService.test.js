import { describe, it, expect } from 'vitest';
import { score } from './matchService.js';

const profile = {
  skills: ['javascript', 'react', 'node.js', 'express', 'mongodb', 'docker', 'aws'],
  titles: ['full stack', 'developer'],
};

const preferences = {
  titles: ['full stack developer', 'mern developer'],
  remote: true,
  locations: ['bengaluru'],
  strongMatchThreshold: 70,
};

describe('matchService.score', () => {
  it('always returns an integer score within [0,100]', () => {
    const listings = [
      { title: '', description: '', remote: false, location: '' },
      {
        title: 'Full Stack Developer',
        description: 'React Node.js Express MongoDB Docker AWS JavaScript',
        remote: true,
        location: 'Remote',
      },
      { title: 'Chef', description: 'cooking', remote: false, location: 'Paris' },
    ];
    for (const l of listings) {
      const r = score(l, profile, preferences);
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('strong-match flag is consistent with the threshold', () => {
    const listing = {
      title: 'Full Stack Developer',
      description: 'React Node.js Express MongoDB Docker AWS JavaScript remote',
      remote: true,
      location: 'Remote',
    };
    const r = score(listing, profile, preferences);
    expect(r.isStrongMatch).toBe(r.score >= preferences.strongMatchThreshold);
  });

  it('scores a highly relevant remote listing higher than an irrelevant one', () => {
    const good = score(
      {
        title: 'Full Stack Developer',
        description: 'React Node.js Express MongoDB Docker AWS JavaScript',
        remote: true,
        location: 'Remote',
      },
      profile,
      preferences
    );
    const bad = score(
      { title: 'Marketing Manager', description: 'SEO campaigns', remote: false, location: 'Paris' },
      profile,
      preferences
    );
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.isStrongMatch).toBe(true);
  });

  it('gives a near-perfect score when everything matches', () => {
    const r = score(
      {
        title: 'Full Stack Developer',
        description: 'JavaScript React Node.js Express MongoDB Docker AWS',
        remote: true,
        location: 'Remote',
      },
      profile,
      preferences
    );
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('handles empty profile/preferences without throwing', () => {
    const r = score({ title: 'Anything', description: 'x' }, {}, {});
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
