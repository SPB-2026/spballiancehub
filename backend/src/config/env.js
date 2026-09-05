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

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

if (fs.existsSync(envPath)) {
  for (const [k, v] of Object.entries(parseEnv(envPath))) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4173', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // PostgreSQL connection string
  DATABASE_URL: process.env.DATABASE_URL || '',

  // PostgreSQL SSL mode
  PGSSLMODE: process.env.PGSSLMODE || 'disable',

  // Gift-code fetch interval in seconds
  GIFT_CODE_FETCH_INTERVAL: parseInt(
    process.env.GIFT_CODE_FETCH_INTERVAL || String(6 * 60 * 60),
    10
  ),

  IS_PROD: process.env.NODE_ENV === 'production',

  // Production CORS: comma-separated list of allowed frontend origins.
  // Example: https://your-app.vercel.app,https://preview-xyz.vercel.app
  // If set, only these origins (plus dev localhost when not in production)
  // receive CORS headers. Never commits a real domain — configure via env.
  FRONTEND_URL: (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '').trim(),

  // JWT secret for CSRF double-submit tokens (and any future auth).
  // In production set a long random value via env (e.g. openssl rand -hex 32).
  // Locally falls back to dev value so `npm run dev` works without .env.
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
};

module.exports = env;