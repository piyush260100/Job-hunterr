/**
 * Preferences persistence. Single-user: one Preferences document.
 * When unset, defaults are derived from the parsed profile (requirement 2.2).
 */
import { Preferences } from '../models/Preferences.js';
import { getOrCreateProfile } from './profileService.js';

export async function getOrCreatePreferences() {
  let prefs = await Preferences.findOne();
  if (!prefs) {
    prefs = await Preferences.create({});
    await seedFromProfile(prefs);
  }
  return prefs;
}

/**
 * If preferences are empty, seed titles/keywords/locations from the profile.
 * Only fills empty arrays so it never overrides user choices.
 */
async function seedFromProfile(prefs) {
  const profile = await getOrCreateProfile();
  let changed = false;

  if (prefs.titles.length === 0 && profile.titles.length) {
    prefs.titles = [...profile.titles];
    changed = true;
  }
  if (prefs.keywords.length === 0 && profile.skills.length) {
    prefs.keywords = [...profile.skills];
    changed = true;
  }
  if (prefs.locations.length === 0 && profile.locations.length) {
    prefs.locations = [...profile.locations];
    changed = true;
  }

  if (changed) await prefs.save();
  return prefs;
}

const EDITABLE_FIELDS = [
  'titles', 'keywords', 'locations', 'remote', 'onsite',
  'salaryFloor', 'strongMatchThreshold', 'fetchIntervalMinutes',
];

export async function updatePreferences(updates = {}) {
  const prefs = await getOrCreatePreferences();
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      prefs[field] = updates[field];
    }
  }
  await prefs.save();
  return prefs;
}
