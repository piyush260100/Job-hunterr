/**
 * Environment loading and validation.
 *
 * Core config (e.g. MONGODB_URI) is required and the process fails fast if it is
 * missing. Optional integrations (job sources, LLM, notifications) degrade
 * gracefully: when their keys are absent, the related feature/source is simply
 * disabled. This satisfies requirements 8.1 and 8.3.
 */
import 'dotenv/config';
import { logger } from '../utils/logger.js';

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    logger.error(`Missing required environment variable: ${name}`);
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

function csv(name) {
  const value = optional(name);
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build and validate the config object. Call once at startup.
 * @param {boolean} requireCore - when false (e.g. unit tests), core keys are not enforced.
 */
export function loadConfig({ requireCore = true } = {}) {
  const mongoUri = requireCore ? required('MONGODB_URI') : optional('MONGODB_URI');

  const config = {
    core: {
      mongoUri,
      port: Number(optional('PORT', '4000')),
      clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:5173'),
    },
    network: {
      // Explicit outbound proxy URL for corporate networks, e.g. http://proxy:8080.
      // Honors standard env var names as well.
      httpsProxy:
        optional('HTTPS_PROXY') || optional('https_proxy') || optional('HTTP_PROXY') ||
        optional('http_proxy'),
      // Path to a corporate root CA bundle (PEM). Node also reads NODE_EXTRA_CA_CERTS
      // natively; this is surfaced for logging/clarity.
      extraCaCerts: optional('NODE_EXTRA_CA_CERTS'),
    },
    sources: {
      adzuna: {
        appId: optional('ADZUNA_APP_ID'),
        appKey: optional('ADZUNA_APP_KEY'),
        country: optional('ADZUNA_COUNTRY', 'in'),
      },
      jooble: {
        apiKey: optional('JOOBLE_API_KEY'),
      },
      rss: {
        feedUrls: csv('RSS_FEED_URLS'),
      },
      linkedin: {
        // Official LinkedIn Partner API. Requires Partner Program approval for a jobs
        // product. All four are needed to enable the adapter.
        clientId: optional('LINKEDIN_CLIENT_ID'),
        clientSecret: optional('LINKEDIN_CLIENT_SECRET'),
        accessToken: optional('LINKEDIN_ACCESS_TOKEN'),
        // The approved jobs-search API base URL LinkedIn assigns to your partner app.
        apiBaseUrl: optional('LINKEDIN_API_BASE_URL'),
      },
      // Remotive requires no key and is always available.
    },
    llm: {
      provider: optional('LLM_PROVIDER'),
      apiKey: optional('LLM_API_KEY'),
    },
    notifications: {
      smtp: {
        host: optional('SMTP_HOST'),
        port: Number(optional('SMTP_PORT', '587')),
        user: optional('SMTP_USER'),
        pass: optional('SMTP_PASS'),
        from: optional('ALERT_EMAIL_FROM'),
        to: optional('ALERT_EMAIL_TO'),
      },
      telegram: {
        botToken: optional('TELEGRAM_BOT_TOKEN'),
        chatId: optional('TELEGRAM_CHAT_ID'),
      },
    },
  };

  return config;
}

/**
 * Convenience singleton for app runtime.
 *
 * We do NOT hard-require core config at import time. Instead the server boots, the
 * HTTP layer comes up, and DB connection is attempted separately. If MONGODB_URI is
 * missing or the DB is unreachable, the server still serves non-DB endpoints (e.g.
 * diagnostics) and returns a clear 503 for DB-backed routes, rather than crashing.
 * This keeps the frontend from seeing an unexplained "Failed to fetch".
 */
export const config = loadConfig({ requireCore: false });

/** True when a database connection string is configured. */
export const hasMongoUri = Boolean(config.core.mongoUri);
