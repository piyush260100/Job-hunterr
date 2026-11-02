/**
 * Quick standalone DB connectivity test.
 *
 * Usage:
 *   node scripts/test-db.js "mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/jobhunter"
 * or with MONGODB_URI set in server/.env:
 *   node scripts/test-db.js
 *
 * Prints a clear success/failure message so you can validate a connection string
 * before relying on it. Does not modify any data.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.argv[2] || process.env.MONGODB_URI;

if (!uri) {
  console.error('No connection string. Pass one as an argument or set MONGODB_URI in .env.');
  process.exit(1);
}

const redacted = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log(`Testing connection to: ${redacted}`);

const start = Date.now();
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const admin = mongoose.connection.db.admin();
  const info = await admin.ping();
  console.log(`SUCCESS: connected and pinged in ${Date.now() - start} ms`, info);
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error(`FAILED after ${Date.now() - start} ms: ${err.message}`);
  if (/ECONNREFUSED|ETIMEDOUT|querySrv|getaddrinfo|ENOTFOUND/i.test(err.message)) {
    console.error(
      'Hint: this often means outbound port 27017 (or DNS SRV lookup) is blocked by ' +
        'your network/firewall. Try a different network, or ask IT to allow egress to ' +
        'your Atlas cluster.'
    );
  }
  process.exit(1);
}
