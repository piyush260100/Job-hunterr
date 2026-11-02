/**
 * Launcher that ensures NODE_EXTRA_CA_CERTS is applied.
 *
 * Node reads NODE_EXTRA_CA_CERTS only at process startup, BEFORE any JS runs. Loading
 * it via dotenv inside the app is too late for the app's own outbound TLS. So this
 * launcher reads the value from .env first, then spawns the real server as a child
 * process with that variable already set in its environment.
 *
 * Usage (from package.json):
 *   node scripts/launch.js --watch   -> dev (with --watch)
 *   node scripts/launch.js           -> start
 */
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, '..');

// Minimal .env parse for the one key we need before Node TLS init.
function readEnvValue(key) {
  const envPath = resolve(serverDir, '.env');
  if (!existsSync(envPath)) return undefined;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && m[1] === key) {
      return m[2].replace(/^["']|["']$/g, '').trim();
    }
  }
  return undefined;
}

const env = { ...process.env };
const caPath = readEnvValue('NODE_EXTRA_CA_CERTS');
if (caPath) {
  // Resolve relative to the server dir so it works regardless of cwd.
  env.NODE_EXTRA_CA_CERTS = resolve(serverDir, caPath);
}

const watch = process.argv.includes('--watch');
const args = [];
if (watch) args.push('--watch');
args.push(resolve(serverDir, 'src/server.js'));

const child = spawn(process.execPath, args, {
  cwd: serverDir,
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
