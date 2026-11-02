import mongoose from 'mongoose';
import { matchingConfig } from '../config/matching.js';

const preferencesSchema = new mongoose.Schema(
  {
    titles: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    remote: { type: Boolean, default: true },
    onsite: { type: Boolean, default: false },
    salaryFloor: { type: Number, default: null },
    strongMatchThreshold: {
      type: Number,
      default: matchingConfig.defaultStrongMatchThreshold,
      min: 0,
      max: 100,
    },
    fetchIntervalMinutes: {
      type: Number,
      default: matchingConfig.defaultFetchIntervalMinutes,
      min: 1,
    },
  },
  { timestamps: true }
);

export const Preferences = mongoose.model('Preferences', preferencesSchema);
