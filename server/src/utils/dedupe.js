/**
 * Stable dedupe-key generation for listings. Uses a sha1 hash of the source key
 * plus the best available stable identifier (external id, falling back to URL).
 */
import { createHash } from 'crypto';

export function makeDedupeKey(sourceKey, externalId, url) {
  const basis = `${sourceKey}::${externalId || url || ''}`.toLowerCase().trim();
  return createHash('sha1').update(basis).digest('hex');
}
