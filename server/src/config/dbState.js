/**
 * Tracks whether the database connection is ready, so routes that need the DB can
 * return a clear 503 instead of hanging or throwing opaque errors.
 */
let dbReady = false;

export function setDbReady(value) {
  dbReady = Boolean(value);
}

export function isDbReady() {
  return dbReady;
}
