import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema(
  {
    company: String,
    role: String,
    start: String,
    end: String,
    summary: String,
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    links: {
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    skills: { type: [String], default: [] },
    titles: { type: [String], default: [] },
    experience: { type: [experienceSchema], default: [] },
    locations: { type: [String], default: [] },
    rawResumeText: { type: String, default: '' },
    resumeFileName: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Profile = mongoose.model('Profile', profileSchema);
