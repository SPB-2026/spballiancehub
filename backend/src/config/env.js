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
};

module.exports = env;
