import { runCycleNow } from '../jobs/fetchCycle.js';

export async function runFetch(req, res, next) {
  try {
    const summary = await runCycleNow();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
