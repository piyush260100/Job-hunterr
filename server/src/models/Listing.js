import mongoose from 'mongoose';

export const LISTING_STATUSES = ['new', 'saved', 'applied', 'rejected', 'interview'];

const listingSchema = new mongoose.Schema(
  {
    // Unique dedupe key (hash of sourceKey + externalId/url). Enforces the
    // dedupe invariant (design Property 1 / requirement 3.3).
    dedupeKey: { type: String, required: true, unique: true, index: true },
    sourceKey: { type: String, required: true },
    externalId: { type: String, default: '' },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    location: { type: String, default: '' },
    remote: { type: Boolean, default: false },
    url: { type: String, default: '' },
    description: { type: String, default: '' },
    postedAt: { type: Date, default: null },
    fetchedAt: { type: Date, default: Date.now },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    isStrongMatch: { type: Boolean, default: false },
    status: { type: String, enum: LISTING_STATUSES, default: 'new' },
    notified: { type: Boolean, default: false },
    tailoredDocs: {
      resume: { type: String, default: '' },
      coverLetter: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

listingSchema.index({ matchScore: -1 });

export const Listing = mongoose.model('Listing', listingSchema);
