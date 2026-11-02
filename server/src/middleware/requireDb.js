/**
 * Guard for routes that require the database. Returns a clear 503 when the DB is not
 * connected, so the frontend shows a helpful message instead of a generic failure.
 */
import { isDbReady } from '../config/dbState.js';

export function requireDb(req, res, next) {
  if (!isDbReady()) {
    return res.status(503).json({
      error: {
        message:
          'Database not connected. Set MONGODB_URI in server/.env and restart the ' +
          'server to enable this feature.',
      },
    });
  }
  next();
}
