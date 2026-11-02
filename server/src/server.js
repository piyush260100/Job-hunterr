/**
 * Server bootstrap.
 *
 * The HTTP server ALWAYS starts so the frontend can reach it. The database connection
 * is attempted separately: if MONGODB_URI is missing or Mongo is unreachable, we log a
 * clear warning and keep serving non-DB endpoints (diagnostics, health). DB-backed
 * routes return a 503 with a helpful message instead of the whole process crashing.
 */
import { config, hasMongoUri } from './config/env.js';
import { connectDb } from './config/db.js';
import { configureOutboundHttp } from './config/http.js';
import { createApp } from './app.js';
import { setDbReady } from './config/dbState.js';
import { syncSourceRecords } from './services/sourceService.js';
import { startScheduler } from './jobs/fetchCycle.js';
import { logger } from './utils/logger.js';

async function main() {
  // Configure proxy/CA for outbound calls before any fetching happens.
  configureOutboundHttp();

  // Start HTTP immediately so the client never sees an unexplained "Failed to fetch".
  const app = createApp();
  app.listen(config.core.port, () => {
    logger.info(`API listening on http://localhost:${config.core.port}`);
  });

  // Attempt the database connection without crashing the process on failure.
  if (!hasMongoUri) {
    logger.warn(
      'MONGODB_URI is not set. The server is running, but database-backed features ' +
        'are disabled until you add it to server/.env. Non-DB endpoints (e.g. ' +
        '/api/diagnostics/connectivity) still work.'
    );
    return;
  }

  try {
    await connectDb(config.core.mongoUri);
    setDbReady(true);
    await syncSourceRecords();
    await startScheduler();
  } catch (err) {
    setDbReady(false);
    logger.error(
      `Could not connect to MongoDB: ${err.message}. The server is still running; ` +
        'database-backed features will return 503 until the connection succeeds.'
    );
  }
}

main().catch((err) => {
  logger.error('Fatal startup error:', err.message);
  process.exit(1);
});
