/**
 * Outbound connectivity diagnostics.
 *
 * Probes each job-source host to tell whether the current network can reach it, and
 * classifies failures so the user knows whether it's a TLS/proxy issue, a firewall
 * block, or a timeout. Purely diagnostic: small GET requests, no data stored.
 */
import { logger } from '../utils/logger.js';

const TARGETS = [
  { key: 'remotive', label: 'Remotive API', url: 'https://remotive.com/api/remote-jobs?limit=1', expectsJson: true },
  { key: 'adzuna', label: 'Adzuna API', url: 'https://api.adzuna.com/v1/api/version', expectsJson: false },
  { key: 'jooble', label: 'Jooble', url: 'https://jooble.org/', expectsJson: false },
];

/** The host (origin) for a target URL, for display and as a clickable link. */
function hostFor(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Classify a fetch failure into a user-meaningful category. */
function classifyError(err) {
  const code = err?.cause?.code || err?.code || '';
  const msg = (err?.cause?.message || err?.message || '').toLowerCase();

  if (/unable_to_get_issuer_cert|self_signed|cert|tls|dept/i.test(code + msg)) {
    return {
      status: 'tls_intercept',
      hint: 'TLS-intercepting proxy. Set NODE_EXTRA_CA_CERTS to your corporate root CA.',
    };
  }
  if (code === 'ETIMEDOUT' || /timeout|timed out/.test(msg)) {
    return { status: 'timeout', hint: 'Request timed out. Possible firewall or slow proxy.' };
  }
  if (code === 'ENOTFOUND' || /getaddrinfo|enotfound/.test(msg)) {
    return { status: 'dns_blocked', hint: 'DNS lookup failed. Host may be blocked by the network.' };
  }
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return { status: 'refused', hint: 'Connection refused/reset. Likely firewall or proxy policy.' };
  }
  return { status: 'error', hint: err?.message || 'Unknown network error.' };
}

/** Probe a single target with a timeout. */
async function probe(target, timeoutMs = 8000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target.url, { signal: controller.signal });
    const ms = Date.now() - started;

    // A real API should return JSON; a proxy block page returns HTML.
    const contentType = res.headers.get('content-type') || '';
    const isHtml = !contentType.includes('application/json');

    // Detect an explicit security-policy block (e.g. Cisco Secure Access / Umbrella
    // returns 403 and/or a block.sse.cisco.com redirect page).
    if (res.status === 403 || (isHtml && target.expectsJson)) {
      let body = '';
      try {
        body = (await res.text()).slice(0, 300);
      } catch {
        // ignore
      }
      const isPolicyBlock =
        res.status === 403 || /block\.sse\.cisco\.com|umbrella|blocked by|access denied/i.test(body);
      return {
        key: target.key,
        label: target.label,
        host: hostFor(target.url),
        url: target.url,
        status: isPolicyBlock ? 'policy_blocked' : 'blocked_html',
        httpStatus: res.status,
        ms,
        hint: isPolicyBlock
          ? 'Blocked by your network security policy (e.g. Cisco Secure Access). A CA ' +
            'cert cannot bypass this; the site must be allow-listed by IT, or run off ' +
            'this network.'
          : 'Got a non-JSON page (likely a block page), not the API.',
      };
    }

    return {
      key: target.key,
      label: target.label,
      host: hostFor(target.url),
      url: target.url,
      status: res.ok ? 'ok' : 'http_error',
      httpStatus: res.status,
      ms,
      hint: res.ok ? 'Reachable.' : `HTTP ${res.status} from host.`,
    };
  } catch (err) {
    const { status, hint } = classifyError(err);
    return {
      key: target.key,
      label: target.label,
      host: hostFor(target.url),
      url: target.url,
      status,
      httpStatus: null,
      ms: Date.now() - started,
      hint,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Run all probes in parallel and return a summary. */
export async function runConnectivityCheck() {
  logger.info('Running outbound connectivity diagnostics...');
  const results = await Promise.all(TARGETS.map((t) => probe(t)));
  const anyReachable = results.some((r) => r.status === 'ok');
  return {
    checkedAt: new Date().toISOString(),
    anyReachable,
    results,
  };
}
