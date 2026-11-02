/**
 * Matching engine. Scores a normalized listing against the user's profile and
 * preferences, producing an integer in [0, 100] and a strong-match flag.
 *
 * Weights and the default threshold are centralized in config/matching.js so a
 * matching rule change is a config edit (steering rules §5).
 *
 * Correctness:
 *  - Property 2: score is always an integer within [0, 100].
 *  - Property 3: isStrongMatch === (score >= threshold).
 */
import { matchingConfig } from '../config/matching.js';
import { tokenize, containsPhrase, clamp } from '../utils/text.js';

/**
 * Skill overlap sub-score in [0,1]: fraction of profile skills that appear in the
 * listing's title + description.
 */
function skillOverlapScore(profile, listing) {
  const skills = (profile.skills || []).map((s) => String(s).toLowerCase());
  if (skills.length === 0) return 0;
  const haystack = `${listing.title || ''} ${listing.description || ''}`.toLowerCase();
  const tokens = new Set(tokenize(haystack));
  let hits = 0;
  for (const skill of skills) {
    // Multi-token skills (e.g. "node.js", "ci/cd") checked as phrases; single as token.
    if (skill.includes(' ')) {
      if (containsPhrase(haystack, skill)) hits += 1;
    } else if (tokens.has(skill) || haystack.includes(skill)) {
      hits += 1;
    }
  }
  return hits / skills.length;
}

/**
 * Title relevance sub-score in [0,1]: best overlap between any preference title and
 * the listing title, measured as fraction of the preference-title tokens present.
 */
function titleRelevanceScore(preferences, listing) {
  const prefTitles = (preferences.titles || []).map((t) => String(t).toLowerCase());
  if (prefTitles.length === 0) return 0;
  const titleTokens = new Set(tokenize(listing.title || ''));
  let best = 0;
  for (const pref of prefTitles) {
    const prefTokens = tokenize(pref);
    if (prefTokens.length === 0) continue;
    const matched = prefTokens.filter((t) => titleTokens.has(t)).length;
    best = Math.max(best, matched / prefTokens.length);
  }
  return best;
}

/**
 * Location/remote fit sub-score in [0,1].
 *  - If the user wants remote and the listing is remote => 1.
 *  - Else if a preferred location string appears in the listing location => 1.
 *  - If the user has no location/remote preference set => neutral 0.5.
 *  - Otherwise 0.
 */
function locationFitScore(preferences, listing) {
  const wantsRemote = Boolean(preferences.remote);
  const locations = (preferences.locations || []).map((l) => String(l).toLowerCase());
  const hasPref = wantsRemote || locations.length > 0;

  if (!hasPref) return 0.5;
  if (wantsRemote && listing.remote) return 1;

  const listingLoc = String(listing.location || '').toLowerCase();
  if (locations.some((loc) => loc && listingLoc.includes(loc))) return 1;

  // Onsite acceptable but no match, or remote wanted but listing not remote.
  return 0;
}

/**
 * Compute the overall match score.
 * @returns {{ score: number, isStrongMatch: boolean, breakdown: object }}
 */
export function score(listing, profile = {}, preferences = {}) {
  const w = matchingConfig.weights;
  const skill = skillOverlapScore(profile, listing);
  const title = titleRelevanceScore(preferences, listing);
  const location = locationFitScore(preferences, listing);

  const raw =
    skill * w.skillOverlap + title * w.titleRelevance + location * w.locationFit;

  const finalScore = clamp(Math.round(raw * 100), 0, 100);

  const threshold =
    preferences.strongMatchThreshold ?? matchingConfig.defaultStrongMatchThreshold;

  return {
    score: finalScore,
    isStrongMatch: finalScore >= threshold,
    breakdown: { skill, title, location },
  };
}
