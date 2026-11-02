import {
  getOrCreatePreferences,
  updatePreferences,
} from '../services/preferencesService.js';

export async function getPreferences(req, res, next) {
  try {
    const prefs = await getOrCreatePreferences();
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}

export async function putPreferences(req, res, next) {
  try {
    const prefs = await updatePreferences(req.body || {});
    res.json(prefs);
  } catch (err) {
    next(err);
  }
}
