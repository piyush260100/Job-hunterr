/**
 * Standalone outbound-fetch test across job portals. Prints a clear verdict per host.
 */
const targets = [
  'https://remotive.com/api/remote-jobs?limit=1',
  'https://api.adzuna.com/v1/api/version',
  'https://jooble.org/',
  'https://www.linkedin.com/jobs/search/?keywords=developer',
  'https://www.naukri.com/developer-jobs',
  'https://in.indeed.com/jobs?q=developer',
  'https://wellfound.com/role/r/developer',
];

console.log('NODE_EXTRA_CA_CERTS =', process.env.NODE_EXTRA_CA_CERTS || '(unset)');

for (const url of targets) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ct = res.headers.get('content-type') || '';
    let verdict;
    if (res.status >= 300 && res.status < 400) verdict = `REDIRECT ${res.status} -> ${res.headers.get('location')?.slice(0, 60)}`;
    else if (res.ok && ct.includes('application/json')) verdict = 'REACHABLE (json)';
    else if (res.ok) verdict = `REACHABLE (${ct})`;
    else if (res.status === 403) verdict = 'BLOCKED by policy (403)';
    else verdict = `HTTP ${res.status} (${ct})`;
    console.log(`${verdict.padEnd(34)} ${url}`);
  } catch (e) {
    console.log(`FAIL (${(e.cause?.code || e.message)})`.padEnd(34) + ` ${url}`);
  }
}
