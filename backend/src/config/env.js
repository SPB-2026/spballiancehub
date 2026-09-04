// Minimal .env loader (no dependency). Loads from <project root>/.env
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const envPath = path.join(ROOT, '.env');

function parseEnv(file) {
  const out = {};
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (fs.existsSync(envPath)) {
  for (const [k, v] of Object.entries(parseEnv(envPath))) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4173', 10),
  JWT_SECRET: process.env.JWT_SECRET || '',
  // PostgreSQL connection string — the application database.
  // Example: postgresql://user:password@host:5432/dbname
  DATABASE_URL: process.env.DATABASE_URL || '',
  // SSL mode for hosted PostgreSQL: disable (default, local) | require | verify-full
  PGSSLMODE: process.env.PGSSLMODE || 'disable',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'SPB@2026#Admin',
  // How often the Kingshot gift-code fetcher checks its sources (seconds).
  // Default 6h; the job clamps to a 1h minimum. Applied at boot (in-process
  // scheduler).
  GIFT_CODE_FETCH_INTERVAL: parseInt(process.env.GIFT_CODE_FETCH_INTERVAL || String(6 * 60 * 60), 10),
  IS_PROD: process.env.NODE_ENV === 'production',
};

if (!env.JWT_SECRET) {
  if (env.IS_PROD) {
    throw new Error(
      'JWT_SECRET is not set. Configure JWT_SECRET in Railway Variables.'
    );
  }

  console.warn(
    '[env] WARNING: JWT_SECRET is not set in development.'
  );
}

module.exports = env;