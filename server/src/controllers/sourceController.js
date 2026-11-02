import {
  listSourcesWithStatus,
  updateSource,
} from '../services/sourceService.js';

export async function getSources(req, res, next) {
  try {
    const sources = await listSourcesWithStatus();
    res.json(sources);
  } catch (err) {
    next(err);
  }
}

export async function putSource(req, res, next) {
  try {
    const doc = await updateSource(req.params.key, req.body || {});
    res.json(doc);
  } catch (err) {
    next(err);
  }
}
