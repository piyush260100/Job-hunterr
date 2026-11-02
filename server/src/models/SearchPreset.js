import mongoose from 'mongoose';

/**
 * A saved LinkedIn search: a named role + filter combination the user can re-run.
 * Filters mirror the LinkedIn search form (see utils/linkedinSearch.js).
 */
const searchPresetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, default: '' },
    location: { type: String, default: '' },
    datePosted: { type: String, default: 'day' }, // any|day|week|month
    workplace: { type: [String], default: [] }, // onsite|remote|hybrid
    experience: { type: [String], default: [] }, // internship..executive
    jobType: { type: [String], default: [] }, // fulltime|contract|...
    minSalary: { type: String, default: '' }, // LinkedIn salary bucket key, e.g. "100k"
    minExperienceYears: { type: Number, default: null }, // folded into keywords
    easyApply: { type: Boolean, default: false },
    sort: { type: String, default: 'date' }, // date|relevance
  },
  { timestamps: true }
);

export const SearchPreset = mongoose.model('SearchPreset', searchPresetSchema);
