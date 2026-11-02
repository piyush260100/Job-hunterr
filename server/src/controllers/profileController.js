import {
  getOrCreateProfile,
  updateProfile,
  applyParsedResume,
} from '../services/profileService.js';
import { ingestResume } from '../services/resumeService.js';
import { logger } from '../utils/logger.js';

export async function getProfile(req, res, next) {
  try {
    const profile = await getOrCreateProfile();
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function putProfile(req, res, next) {
  try {
    const profile = await updateProfile(req.body || {});
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded.' } });
    }
    // Validate type: only PDF supported (requirement 1.5).
    if (req.file.mimetype !== 'application/pdf') {
      return res
        .status(400)
        .json({ error: { message: 'Unsupported format. Please upload a PDF.' } });
    }

    const parsed = await ingestResume(req.file.buffer);
    const profile = await applyParsedResume(parsed, req.file.originalname);
    res.json(profile);
  } catch (err) {
    logger.error('Resume upload failed:', err.message);
    next(err);
  }
}
