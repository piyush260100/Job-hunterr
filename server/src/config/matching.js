/**
 * Centralized matching configuration.
 *
 * Per steering rules (.kiro/steering/rules.md §5), a "matching rule change" must be a
 * config edit here, not scattered logic in the scoring code. Weights must sum to 1.0.
 */
export const matchingConfig = {
  weights: {
    skillOverlap: 0.5, // skills in profile found in the listing
    titleRelevance: 0.3, // preference titles vs listing title
    locationFit: 0.2, // remote/location preference match
  },
  // Default strong-match threshold; a per-user override lives in Preferences.
  defaultStrongMatchThreshold: 70,
  // Default fetch interval in minutes; per-user override lives in Preferences.
  defaultFetchIntervalMinutes: 15,
};

// Guard: weights should sum to 1 (allow tiny float error).
const weightSum = Object.values(matchingConfig.weights).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`matchingConfig weights must sum to 1.0 (got ${weightSum})`);
}
