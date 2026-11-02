import {
  listPresets,
  createPreset,
  deletePreset,
} from '../services/searchPresetService.js';

export async function getPresets(req, res, next) {
  try {
    res.json(await listPresets());
  } catch (err) {
    next(err);
  }
}

export async function postPreset(req, res, next) {
  try {
    const preset = await createPreset(req.body || {});
    res.status(201).json(preset);
  } catch (err) {
    next(err);
  }
}

export async function removePreset(req, res, next) {
  try {
    await deletePreset(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
