/**
 * Shared text helpers used by matching and resume parsing.
 */

/** Lowercase and collapse whitespace. */
export function normalizeWhitespace(str = '') {
  return String(str).replace(/\s+/g, ' ').trim();
}

/** Tokenize into lowercase word tokens (alphanumerics, +, #, . for things like c++, c#, node.js). */
export function tokenize(str = '') {
  return String(str)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((t) => t.replace(/^\.+|\.+$/g, '')) // trim stray dots
    .filter(Boolean);
}

/** Case-insensitive "does haystack contain this phrase as a token sequence". */
export function containsPhrase(haystack = '', phrase = '') {
  const h = ` ${String(haystack).toLowerCase()} `;
  const p = ` ${String(phrase).toLowerCase().trim()} `;
  if (!p.trim()) return false;
  return h.includes(p) || new RegExp(`\\b${escapeRegExp(phrase.toLowerCase())}\\b`).test(h);
}

export function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Clamp a number into [min, max]. */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
