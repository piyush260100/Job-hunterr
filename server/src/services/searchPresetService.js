/**
 * Saved search preset persistence.
 */
import { SearchPreset } from '../models/SearchPreset.js';

const FIELDS = [
  'name', 'role', 'location', 'datePosted', 'workplace',
  'experience', 'jobType', 'minSalary', 'minExperienceYears', 'easyApply', 'sort',
];

export async function listPresets() {
  return SearchPreset.find().sort({ updatedAt: -1 });
}

export async function createPreset(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) {
    const err = new Error('A preset name is required.');
    err.status = 400;
    throw err;
  }
  const doc = {};
  for (const f of FIELDS) {
    if (input[f] !== undefined) doc[f] = input[f];
  }
  doc.name = name;
  return SearchPreset.create(doc);
}

export async function deletePreset(id) {
  const doc = await SearchPreset.findByIdAndDelete(id);
  if (!doc) {
    const err = new Error('Preset not found');
    err.status = 404;
    throw err;
  }
  return doc;
}
