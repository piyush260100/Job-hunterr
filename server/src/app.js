/**
 * Express app factory. Separated from server bootstrap so it can be imported in
 * tests without starting the scheduler or binding a port.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import profileRoutes from './routes/profileRoutes.js';
import preferencesRoutes from './routes/preferencesRoutes.js';
import sourceRoutes from './routes/sourceRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import fetchRoutes from './routes/fetchRoutes.js';
import searchPresetRoutes from './routes/searchPresetRoutes.js';
import diagnosticsRoutes from './routes/diagnosticsRoutes.js';
import { requireDb } from './middleware/requireDb.js';
import { isDbReady } from './config/dbState.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.core.clientOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      dbConnected: isDbReady(),
      time: new Date().toISOString(),
    });
  });

  // Diagnostics and health work without a database.
  app.use('/api/diagnostics', diagnosticsRoutes);

  // Database-backed routes: guarded so they return a clear 503 when the DB is down.
  app.use('/api/profile', requireDb, profileRoutes);
  app.use('/api/preferences', requireDb, preferencesRoutes);
  app.use('/api/sources', requireDb, sourceRoutes);
  app.use('/api/listings', requireDb, listingRoutes);
  app.use('/api/fetch', requireDb, fetchRoutes);
  app.use('/api/search-presets', requireDb, searchPresetRoutes);

  // 404 for unknown API routes.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
  });

  // Centralized error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) logger.error(err.stack || err.message);
    res.status(status).json({ error: { message: err.message || 'Internal error' } });
  });

  return app;
}
