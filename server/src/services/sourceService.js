/**
 * Source registry. Holds all adapters and exposes the set that is actually usable:
 * an adapter is "active" only if (a) its env config is present (isEnabled) AND
 * (b) the user has not disabled it in the Source collection.
 *
 * This enforces graceful degradation (design Property 6) and the legal-source
 * invariant (Property 5) — only ToS-compliant adapters are registered here.
 */
import { config } from '../config/env.js';
import { Source } from '../models/Source.js';
import { remotiveAdapter } from './sources/remotiveAdapter.js';
import { adzunaAdapter } from './sources/adzunaAdapter.js';
import { joobleAdapter } from './sources/joobleAdapter.js';
import { rssAdapter } from './sources/rssAdapter.js';
import { linkedinAdapter } from './sources/linkedinAdapter.js';

const ALL_ADAPTERS = [
  linkedinAdapter,
  remotiveAdapter,
  adzunaAdapter,
  joobleAdapter,
  rssAdapter,
];

export function getAllAdapters() {
  return ALL_ADAPTERS;
}

export function getAdapter(key) {
  return ALL_ADAPTERS.find((a) => a.key === key);
}

/** Adapters whose env config is present (regardless of user toggle). */
export function getEnvEnabledAdapters(cfg = config) {
  return ALL_ADAPTERS.filter((a) => a.isEnabled(cfg));
}

/**
 * Ensure a Source document exists for every adapter so the UI can list and toggle
 * them. Returns the Source docs.
 */
export async function syncSourceRecords(cfg = config) {
  const results = [];
  for (const adapter of ALL_ADAPTERS) {
    let doc = await Source.findOne({ key: adapter.key });
    if (!doc) {
      doc = await Source.create({
        key: adapter.key,
        label: adapter.label,
        enabled: true,
        lastStatus: adapter.isEnabled(cfg) ? 'never' : 'disabled',
      });
    }
    results.push(doc);
  }
  return results;
}

/**
 * The adapters that will actually run this cycle: env-enabled AND user-enabled.
 */
export async function getActiveAdapters(cfg = config) {
  const envEnabled = getEnvEnabledAdapters(cfg);
  const docs = await Source.find({ key: { $in: envEnabled.map((a) => a.key) } });
  const enabledKeys = new Set(
    docs.filter((d) => d.enabled !== false).map((d) => d.key)
  );
  // If no Source doc exists yet, default to enabled.
  return envEnabled.filter(
    (a) => enabledKeys.has(a.key) || !docs.some((d) => d.key === a.key)
  );
}

/** Build a UI-friendly status list combining adapter + env + user state. */
export async function listSourcesWithStatus(cfg = config) {
  await syncSourceRecords(cfg);
  const docs = await Source.find();
  return ALL_ADAPTERS.map((adapter) => {
    const doc = docs.find((d) => d.key === adapter.key);
    const envConfigured = adapter.isEnabled(cfg);
    return {
      key: adapter.key,
      label: adapter.label,
      requiresCredentials: adapter.requiresCredentials !== false,
      envConfigured,
      enabled: doc ? doc.enabled : true,
      effective: envConfigured && (doc ? doc.enabled : true),
      lastFetchedAt: doc?.lastFetchedAt || null,
      lastStatus: doc?.lastStatus || 'never',
      config: doc?.config || {},
    };
  });
}

export async function updateSource(key, updates = {}) {
  const adapter = getAdapter(key);
  if (!adapter) {
    const err = new Error(`Unknown source: ${key}`);
    err.status = 404;
    throw err;
  }
  const doc = await Source.findOneAndUpdate(
    { key },
    {
      $set: {
        ...(updates.enabled !== undefined ? { enabled: Boolean(updates.enabled) } : {}),
        ...(updates.config !== undefined ? { config: updates.config } : {}),
        label: adapter.label,
      },
    },
    { new: true, upsert: true }
  );
  return doc;
}
