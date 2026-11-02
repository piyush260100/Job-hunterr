# Matching rules

Each listing gets a match score from 0 to 100 computed in
`server/src/services/matchService.js`. Weights and the default threshold live in
`server/src/config/matching.js` so changing a matching rule is a config edit, not a code
change scattered across files (steering rules §5).

## Score formula

```
score = round(100 * (
    skillOverlap  * 0.5 +
    titleRelevance* 0.3 +
    locationFit   * 0.2
))
```

Each sub-score is in [0, 1]:

- **skillOverlap** — fraction of profile skills found in the listing title + description.
  Multi-token skills (e.g. `node.js`, `ci/cd`) are matched as phrases.
- **titleRelevance** — best overlap between any preference title and the listing title,
  as the fraction of preference-title tokens present.
- **locationFit** — 1 if the user wants remote and the listing is remote, or if a
  preferred location appears in the listing location; 0.5 if the user set no location or
  remote preference; otherwise 0.

## Strong match

`isStrongMatch = score >= strongMatchThreshold`, where the threshold defaults to 70 and
can be overridden per user in Preferences. Strong matches drive notifications.

## Changing the rules

Edit `config/matching.js`:
- Adjust `weights` (must sum to 1.0; a guard enforces this).
- Change `defaultStrongMatchThreshold` or `defaultFetchIntervalMinutes`.

After changing weights, run `npm test` in `/server` to confirm the scoring tests still
reflect expected behavior, and update this document.
