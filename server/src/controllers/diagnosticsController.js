import { runConnectivityCheck } from '../services/diagnosticsService.js';

export async function getConnectivity(req, res, next) {
  try {
    const report = await runConnectivityCheck();
    res.json(report);
  } catch (err) {
    next(err);
  }
}
