import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, default: '' },
    // User toggle. Effective only when the adapter is also env-configured.
    enabled: { type: Boolean, default: true },
    // Non-secret source config (e.g. list of RSS URLs). Secrets stay in env.
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastFetchedAt: { type: Date, default: null },
    lastStatus: {
      type: String,
      enum: ['ok', 'error', 'rate_limited', 'disabled', 'never'],
      default: 'never',
    },
  },
  { timestamps: true }
);

export const Source = mongoose.model('Source', sourceSchema);
