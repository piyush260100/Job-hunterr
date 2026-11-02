/**
 * Minimal structured logger. Keeps output consistent and timestamped without
 * pulling in a heavy logging dependency.
 */

function format(level, args) {
  const ts = new Date().toISOString();
  return [`[${ts}] [${level}]`, ...args];
}

export const logger = {
  info(...args) {
    console.log(...format('INFO', args));
  },
  warn(...args) {
    console.warn(...format('WARN', args));
  },
  error(...args) {
    console.error(...format('ERROR', args));
  },
  debug(...args) {
    if (process.env.DEBUG === 'true') {
      console.debug(...format('DEBUG', args));
    }
  },
};
