/**
 * Outbound HTTP configuration for corporate networks.
 *
 * Two independent mechanisms, both optional:
 *  1. Corporate root CA: set NODE_EXTRA_CA_CERTS=path\to\corp-root-ca.pem (Node reads
 *     this natively at startup). This fixes UNABLE_TO_GET_ISSUER_CERT_LOCALLY errors
 *     caused by TLS-intercepting proxies — the secure, recommended fix.
 *  2. Explicit proxy: set HTTPS_PROXY=http://proxy-host:port. We install a global
 *     undici ProxyAgent so the built-in fetch() routes through the proxy.
 *
 * When neither is set, this is a no-op and fetch() behaves normally.
 */
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let configured = false;

export function configureOutboundHttp(cfg = config) {
  if (configured) return;
  configured = true;

  const proxyUrl = cfg.network?.httpsProxy;
  if (proxyUrl) {
    try {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      logger.info(`Outbound HTTP routed through proxy: ${redact(proxyUrl)}`);
    } catch (err) {
      logger.warn(`Failed to configure proxy agent: ${err.message}`);
    }
  }

  if (cfg.network?.extraCaCerts) {
    logger.info(`Using extra CA certs from NODE_EXTRA_CA_CERTS: ${cfg.network.extraCaCerts}`);
  }
}

/** Hide any credentials embedded in a proxy URL before logging. */
function redact(url) {
  try {
    const u = new URL(url);
    if (u.username || u.password) {
      u.username = '***';
      u.password = '***';
    }
    return u.toString();
  } catch {
    return url;
  }
}
