// Versioned schema migrations — `node database/migrate.js` (or `npm run migrate`).
//
// Applies database/migrations/*.sql in filename order, tracking applied files
// in a schema_migrations table (filename + sha256 checksum). Each file runs in
// its own transaction (BEGIN/COMMIT, ROLLBACK on any failure). Idempotent:
// already-applied files are skipped; a modified applied file is refused.
//
// Run this BEFORE starting the server on a fresh database. Safe to run on
// every deploy — it only applies new files. Never prints credentials.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('../backend/node_modules/pg');
const env = require('../backend/src/config/env');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const SSL_MODES = {
  disable: undefined,
  require: { rejectUnauthorized: false },
  'verify-full': {},
};

// Human-readable target for logs — derived from DATABASE_URL but NEVER
// includes the password (URL.password is deliberately not touched).
function describeConnection() {
  try {
    const u = new URL(env.DATABASE_URL);
    return `host=${u.hostname} port=${u.port || '5432'} database=${u.pathname.slice(1) || '(default)'} user=${u.username}`;
  } catch {
    return 'host=unknown database=unknown user=unknown';
  }
}

function fail(err, file) {
  console.error('Migration failed');
  console.error('File: ' + (file || '(none — failed before a migration file was processed)'));
  console.error('Database connection: ' + describeConnection());
  console.error('Error: ' + (err && err.message ? err.message : String(err)));
  // Targeted, safe hints for the common failure classes (no credentials).
  if (err && typeof err.code === 'string') {
    if (err.code === '28P01') console.error('Hint: password authentication failed — the role password does not match DATABASE_URL. Reset it via the postgres admin (ALTER ROLE) and update .env.');
    if (err.code === '42501') console.error('Hint: permission denied — the role likely does not own the database. It should (CREATE DATABASE spb OWNER spb).');
    if (err.code === '3D000') console.error('Hint: database does not exist — create it first (createdb -O <role> <db>).');
    if (err.code === 'ECONNREFUSED') console.error('Hint: PostgreSQL is not listening on that host:port — check the cluster is running and the port in DATABASE_URL.');
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') console.error('Hint: network timeout — verify host/port reachability and any firewall rules.');
  }
  process.exit(1);
}

(async () => {
  if (!env.DATABASE_URL) {
    console.error('Migration failed');
    console.error('File: (none)');
    console.error('Database connection: none — DATABASE_URL is not set');
    console.error('Error: add DATABASE_URL=postgresql://user:password@host:port/database to .env (see .env.example)');
    process.exit(1);
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: SSL_MODES[(env.PGSSLMODE || 'disable').toLowerCase()] ?? undefined,
    connectionTimeoutMillis: 10000, // never hang silently on a dead endpoint
  });

  let currentFile = null;
  try {
    await client.connect();
    console.log('[migrate] connected to PostgreSQL (' + describeConnection() + ')');

    // Tracking table (created as the connecting role; owned by it).
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const applied = new Map(
      (await client.query('SELECT filename, checksum FROM schema_migrations')).rows.map((r) => [r.filename, r.checksum])
    );

    let files = [];
    try {
      files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    } catch (err) {
      throw new Error(`cannot read migrations directory ${MIGRATIONS_DIR}: ${err.message}`);
    }
    if (files.length === 0) {
      console.log('[migrate] no .sql files found in ' + MIGRATIONS_DIR);
      return;
    }

    let n = 0;
    for (const file of files) {
      currentFile = file;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`migration ${file} was modified after being applied — refusing to continue (edit history via a new numbered file)`);
        }
        console.log(`[migrate] ${file} already applied — skipping`);
        continue;
      }
      console.log(`[migrate] applying ${file}`);
      await client.query('BEGIN');
      try {
        // Single simple-query round trip: the whole file (multiple statements,
        // comments, constraints, indexes, sequences, FKs) in ONE transaction.
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, checksum]);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {}); // connection may be dead
        throw err;
      }
      await client.query('COMMIT');
      console.log(`[migrate] ${file} applied successfully`);
      n++;
    }
    console.log(`[migrate] migration complete — ${files.length} file(s), ${n} applied, ${files.length - n} already applied.`);
  } catch (err) {
    fail(err, currentFile);
  } finally {
    await client.end().catch(() => {});
  }
})().catch((err) => fail(err, null)); // outer guard: no failure path may exit silently
