/**
 * LinkedIn jobs SEARCH-URL builder.
 *
 * This does NOT scrape LinkedIn. It only constructs a public job-search URL from the
 * user's preferences so the user can open it in their own logged-in browser session
 * and browse/apply manually. This is the legal, assisted approach (steering rules §1:
 * no scraping, no automated access).
 */

/**
 * LinkedIn's "date posted" filter maps to an f_TPR query param:
 *   past 24h  -> r86400
 *   past week -> r604800
 *   past month-> r2592000
 */
const DATE_POSTED = {
  day: 'r86400',
  week: 'r604800',
  month: 'r2592000',
};

/** LinkedIn workplace filter f_WT: 1=onsite, 2=remote, 3=hybrid. */
const WORKPLACE = {
  onsite: '1',
  remote: '2',
  hybrid: '3',
};

/** LinkedIn experience level f_E: 1=internship ... 6=executive. */
const EXPERIENCE = {
  internship: '1',
  entry: '2',
  associate: '3',
  mid_senior: '4',
  director: '5',
  executive: '6',
};

/** LinkedIn job type f_JT. */
const JOB_TYPE = {
  fulltime: 'F',
  parttime: 'P',
  contract: 'C',
  temporary: 'T',
  internship: 'I',
  volunteer: 'V',
  other: 'O',
};

/**
 * LinkedIn minimum-salary buckets map to f_SB2 codes. NOTE: LinkedIn's salary filter is
 * USD-based and only works where postings carry structured salary data, which is rare
 * for India/INR listings. Offered as best-effort; may reduce results significantly.
 *   1 = $40k+, 2 = $60k+, 3 = $80k+, 4 = $100k+, 5 = $120k+,
 *   6 = $140k+, 7 = $160k+, 8 = $180k+, 9 = $200k+
 */
const SALARY_BUCKET = {
  '40k': '1',
  '60k': '2',
  '80k': '3',
  '100k': '4',
  '120k': '5',
  '140k': '6',
  '160k': '7',
  '180k': '8',
  '200k': '9',
};

/**
 * The filter option catalogue, surfaced to the client so the UI can render the same
 * choices LinkedIn offers. Values are the human keys; the builder maps them to f_* codes.
 */
export const LINKEDIN_FILTER_OPTIONS = {
  datePosted: [
    { value: 'any', label: 'Any time' },
    { value: 'day', label: 'Past 24 hours' },
    { value: 'week', label: 'Past week' },
    { value: 'month', label: 'Past month' },
  ],
  workplace: [
    { value: 'onsite', label: 'On-site' },
    { value: 'remote', label: 'Remote' },
    { value: 'hybrid', label: 'Hybrid' },
  ],
  experience: [
    { value: 'internship', label: 'Internship' },
    { value: 'entry', label: 'Entry level' },
    { value: 'associate', label: 'Associate' },
    { value: 'mid_senior', label: 'Mid-Senior level' },
    { value: 'director', label: 'Director' },
    { value: 'executive', label: 'Executive' },
  ],
  jobType: [
    { value: 'fulltime', label: 'Full-time' },
    { value: 'parttime', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'temporary', label: 'Temporary' },
    { value: 'internship', label: 'Internship' },
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'other', label: 'Other' },
  ],
  sort: [
    { value: 'date', label: 'Most recent' },
    { value: 'relevance', label: 'Most relevant' },
  ],
  // LinkedIn salary buckets (USD-based). See SALARY_BUCKET note above.
  minSalary: [
    { value: '', label: 'Any' },
    { value: '40k', label: '$40,000+' },
    { value: '60k', label: '$60,000+' },
    { value: '80k', label: '$80,000+' },
    { value: '100k', label: '$100,000+' },
    { value: '120k', label: '$120,000+' },
    { value: '140k', label: '$140,000+' },
    { value: '160k', label: '$160,000+' },
    { value: '180k', label: '$180,000+' },
    { value: '200k', label: '$200,000+' },
  ],
};

/**
 * Note surfaced to the UI explaining the limits of salary and experience filtering on
 * LinkedIn, so the user understands why results may shrink or why experience is applied
 * via keywords.
 */
export const LINKEDIN_FILTER_NOTES = {
  minSalary:
    "LinkedIn's salary filter is USD-based and only applies where a posting has " +
    'structured salary data. Many India/INR jobs lack this, so a salary filter can ' +
    'greatly reduce results.',
  minExperienceYears:
    'LinkedIn has no "years of experience" filter. This value is added to your ' +
    'keywords (e.g. "3+ years") to bias results; combine it with the Experience level ' +
    'filter for better targeting.',
};

function mapMulti(values, table) {
  if (!Array.isArray(values)) return '';
  return values
    .map((v) => table[v])
    .filter(Boolean)
    .join(',');
}

/**
 * Build a LinkedIn jobs search URL from an explicit role + filter object. This is the
 * richer builder used by the search form. Still just a URL the user opens themselves.
 *
 * @param {object} q
 *  - role: string (keywords)
 *  - location: string
 *  - datePosted: 'any'|'day'|'week'|'month'
 *  - workplace: string[] (subset of onsite|remote|hybrid)
 *  - experience: string[] (subset of EXPERIENCE keys)
 *  - jobType: string[] (subset of JOB_TYPE keys)
 *  - easyApply: boolean
 *  - sort: 'date'|'relevance'
 * @returns {string} LinkedIn jobs search URL
 */
export function buildLinkedInSearchFromQuery(q = {}) {
  const params = new URLSearchParams();

  // Base keywords. Min-experience has no LinkedIn URL filter, so we fold it into the
  // keyword string as "N+ years" to bias results (documented in LINKEDIN_FILTER_NOTES).
  let keywords = (q.role || '').trim() || 'developer';
  const years = Number(q.minExperienceYears);
  if (Number.isFinite(years) && years > 0) {
    keywords = `${keywords} ${Math.floor(years)}+ years`;
  }
  params.set('keywords', keywords);

  if (q.location && q.location.trim()) params.set('location', q.location.trim());

  const dp = DATE_POSTED[q.datePosted];
  if (dp) params.set('f_TPR', dp);

  const wt = mapMulti(q.workplace, WORKPLACE);
  if (wt) params.set('f_WT', wt);

  const exp = mapMulti(q.experience, EXPERIENCE);
  if (exp) params.set('f_E', exp);

  const jt = mapMulti(q.jobType, JOB_TYPE);
  if (jt) params.set('f_JT', jt);

  // Minimum salary bucket (USD-based; see note).
  const sb = SALARY_BUCKET[q.minSalary];
  if (sb) params.set('f_SB2', sb);

  if (q.easyApply) params.set('f_AL', 'true');

  params.set('sortBy', q.sort === 'relevance' ? 'R' : 'DD');

  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/**
 * Build a LinkedIn jobs search URL.
 * @param {object} preferences - { titles, keywords, locations, remote }
 * @param {object} [opts] - { datePosted: 'day'|'week'|'month' }
 * @returns {string} a https://www.linkedin.com/jobs/search/?... URL
 */
export function buildLinkedInSearchUrl(preferences = {}, opts = {}) {
  const keywords =
    (preferences.titles && preferences.titles[0]) ||
    (preferences.keywords && preferences.keywords[0]) ||
    'developer';
  const location = (preferences.locations && preferences.locations[0]) || '';

  const params = new URLSearchParams();
  params.set('keywords', keywords);
  if (location) params.set('location', location);

  const datePosted = DATE_POSTED[opts.datePosted || 'day'];
  if (datePosted) params.set('f_TPR', datePosted);

  if (preferences.remote) params.set('f_WT', WORKPLACE.remote);

  // Sort by most recent so newly posted jobs surface first.
  params.set('sortBy', 'DD');

  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/**
 * Build search URLs for several job portals from the same preferences, so the user can
 * open any of them in their own browser. These are public search pages, opened by the
 * user; nothing is scraped.
 * @returns {Array<{ key, label, url }>}
 */
export function buildPortalSearchUrls(preferences = {}, opts = {}) {
  const keyword =
    (preferences.titles && preferences.titles[0]) ||
    (preferences.keywords && preferences.keywords[0]) ||
    'developer';
  const location = (preferences.locations && preferences.locations[0]) || '';
  const kwEnc = encodeURIComponent(keyword);
  const locEnc = encodeURIComponent(location);

  const portals = [
    { key: 'linkedin', label: 'LinkedIn', url: buildLinkedInSearchUrl(preferences, opts) },
    {
      key: 'naukri',
      label: 'Naukri',
      // Naukri path format: /<keyword-with-dashes>-jobs-in-<location>
      url: `https://www.naukri.com/${slug(keyword)}-jobs${
        location ? `-in-${slug(location)}` : ''
      }`,
    },
    {
      key: 'indeed',
      label: 'Indeed',
      url: `https://in.indeed.com/jobs?q=${kwEnc}${location ? `&l=${locEnc}` : ''}${
        preferences.remote ? '&sc=0kf%3Aattr(DSQF7)%3B' : ''
      }&fromage=1&sort=date`,
    },
    {
      key: 'wellfound',
      label: 'Wellfound',
      url: `https://wellfound.com/role/r/${slug(keyword)}`,
    },
  ];

  return portals;
}

function slug(s = '') {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
