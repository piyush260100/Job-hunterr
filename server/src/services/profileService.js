/**
 * Profile persistence helpers. The app is single-user, so there is one Profile
 * document; we fetch-or-create it.
 */
import { Profile } from '../models/Profile.js';

export async function getOrCreateProfile() {
  let profile = await Profile.findOne();
  if (!profile) {
    profile = await Profile.create({});
  }
  return profile;
}

/**
 * Apply updates to the profile. Only whitelisted fields are accepted.
 */
const EDITABLE_FIELDS = [
  'name', 'email', 'phone', 'links', 'skills', 'titles', 'experience', 'locations',
];

export async function updateProfile(updates = {}) {
  const profile = await getOrCreateProfile();
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      profile[field] = updates[field];
    }
  }
  await profile.save();
  return profile;
}

/**
 * Merge parsed resume data into the profile WITHOUT clobbering user-entered
 * preferences. Parsed fields fill in only when they add information; existing
 * manual values (e.g. locations the user typed) are preserved (requirement 1.4).
 */
export async function applyParsedResume(parsed, fileName) {
  const profile = await getOrCreateProfile();

  if (parsed.name && !profile.name) profile.name = parsed.name;
  if (parsed.email) profile.email = parsed.email;
  if (parsed.phone) profile.phone = parsed.phone;

  if (parsed.links) {
    profile.links = {
      linkedin: parsed.links.linkedin || profile.links?.linkedin || '',
      github: parsed.links.github || profile.links?.github || '',
      portfolio: parsed.links.portfolio || profile.links?.portfolio || '',
    };
  }

  // Union skills/titles so manual additions survive re-upload.
  profile.skills = unionLower(profile.skills, parsed.skills);
  profile.titles = unionLower(profile.titles, parsed.titles);

  profile.rawResumeText = parsed.rawResumeText || profile.rawResumeText;
  if (fileName) profile.resumeFileName = fileName;

  await profile.save();
  return profile;
}

function unionLower(a = [], b = []) {
  return [...new Set([...a, ...b].map((s) => String(s).toLowerCase()))];
}
