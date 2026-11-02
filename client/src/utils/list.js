/**
 * Helpers for comma-separated list inputs.
 *
 * The UI keeps the RAW text the user types (so commas and spaces work normally) and
 * only parses into an array at save time. parseList accepts commas and/or newlines as
 * separators and trims each entry.
 */
export function parseList(text = '') {
  return String(text)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Turn an array back into editable text for initial display. */
export function listToText(arr = []) {
  return (arr || []).join(', ');
}
