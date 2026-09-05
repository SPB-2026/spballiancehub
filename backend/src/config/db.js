// PostgreSQL connection + query layer.
//
// Simple promise-based interface used by models/services:
//
//   const row  = await db.prepare('SELECT ... WHERE id = ?').get(id);
//   const rows = await db.prepare('SELECT ...').all(...);
//   const info = await db.prepare('INSERT INTO ...').run(...); // { changes, lastInsertRowid }
//   await db.exec(sql);                     // multi-statement (DDL)
//   await db.transaction(async () => {…})  // BEGIN / COMMIT / ROLLBACK
//
// Notes:
// - `?` placeholders are converted to `$1, $2, …` at this boundary (all
//   queries were audited individually; no SQL string contains a literal '?').
// - JS booleans bind as 1/0 — the schema stores every flag as a 0/1 integer.
// - int8 (bigint) parses to a JS number, so COUNT(*) comes back as a number.
// - TIMESTAMPTZ values are serialized back to ISO-8601 strings.
// - pg unique_violation (23505) is rethrown with a "UNIQUE constraint failed"
//   message, matching the wording that service-layer guards
//   (`err.message.includes('UNIQUE')`) rely on.
// - Transactions propagate through AsyncLocalStorage: model calls made
//   anywhere inside db.transaction(fn) automatically join the transaction
//   client, so call sites keep their original shape.
const { Pool, types } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const env = require('./env');

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to .env (see .env.example).');
}

// Safe connection-target context for connection-failure diagnostics: host,
// port, database, environment — parsed from DATABASE_URL; never contains
// the user or password.
const connTarget = (() => {
  try {
    const u = new URL(env.DATABASE_URL);
    return `host=${u.hostname} port=${u.port || '5432'} database=${(u.pathname || '/').slice(1) || '(default)'} environment=${env.NODE_ENV}`;
  } catch {
    return `environment=${env.NODE_ENV} (DATABASE_URL present but not a valid URL)`;
  }
})();
const CONN_ERROR_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'EPIPE']);

// bigint → JS number (row counts, ids, epoch-ms token expiries are all small;
// without this, every `count === 0` check and JSON number would break).
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(2379, (v) => v.map((x) => parseInt(x, 10))); // int8[]

const SSL_MODES = {
  disable: undefined,
  require: { rejectUnauthorized: false },
  'verify-full': {},
};
const sslMode = (env.PGSSLMODE || 'disable').toLowerCase();
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: SSL_MODES[sslMode] ?? SSL_MODES.disable,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  // Idle-client errors must not crash the process. pg error text never
  // contains credentials.
  console.error('[db] idle pool client error:', err.message);
  console.error('[db] code:', err.code, '| stack:', err.stack);
  if (err && CONN_ERROR_CODES.has(err.code)) console.error('[db] connection target:', connTarget);
});

const als = new AsyncLocalStorage();

// Tables whose INSERTs return the new `id` (all other tables use composite or
// non-id primary keys, and no code reads lastInsertRowid from them).
const ID_TABLES = new Set([
  'admins', 'members', 'events', 'news', 'articles',
  'gift_codes', 'gift_redemptions', 'gift_fetch_logs',
  'admin_activity', 'announcements', 'media',
]);

function translatePlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function toParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) args = args[0];
  return args.map((a) => (typeof a === 'boolean' ? (a ? 1 : 0) : a));
}

// Rows come back with the exact value shapes the app always saw:
// TIMESTAMPTZ → ISO-8601 string, everything else untouched.
function serializeValue(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function serializeRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, val] of Object.entries(row)) out[k] = serializeValue(val);
  return out;
}

function mapPgError(err) {
  if (err && typeof err.code === 'string' && err.code.startsWith('235')) {
    const e = new Error(`${err.code === '23505' ? 'UNIQUE constraint failed' : err.code === '23503' ? 'FOREIGN KEY constraint failed' : 'constraint failed'}: ${err.detail || err.constraint || err.message}`);
    e.constraint = err.constraint || null;
    e.code = err.code;
    return e;
  }
  return err;
}

async function execQuery(sql, params) {
  const client = als.getStore()?.client; // inside db.transaction → same client
  const runner = client || pool;
  try {
    return await runner.query(translatePlaceholders(sql), params);
  } catch (err) {
    // Server-side diagnostics only — pg error text contains the SQL and the
    // violated constraint, but never the connection string or credentials.
    // Parameter values are deliberately NOT logged.
    if (err && typeof err === 'object') {
      console.error('[db] query failed:', err.message);
      console.error('[db] code:', err.code);
      if (CONN_ERROR_CODES.has(err.code)) console.error('[db] connection target:', connTarget);
      console.error('[db] detail:', err.detail);
      console.error('[db] hint:', err.hint);
      console.error('[db] where:', err.where);
      console.error('[db] position:', err.position, 'table:', err.table, 'column:', err.column, 'constraint:', err.constraint);
      console.error('[db] stack:', err.stack);
    } else {
      // Non-Error rejection — print the raw value so nothing is hidden.
      console.error('[db] query failed (non-Error):', err);
    }
    throw mapPgError(err);
  }
}

function prepare(sql) {
  const m = /^\s*INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(sql);
  const returningId = Boolean(m) && ID_TABLES.has(m[1].toLowerCase()) && !/returning/i.test(sql);
  const runSql = returningId ? `${sql.replace(/[;\s]+$/, '')} RETURNING id` : sql;

  return {
    get(...args) {
      return execQuery(sql, toParams(args)).then((r) => serializeRow(r.rows[0]));
    },
    all(...args) {
      return execQuery(sql, toParams(args)).then((r) => r.rows.map(serializeRow));
    },
    run(...args) {
      return execQuery(returningId ? runSql : sql, toParams(args)).then((r) => ({
        changes: r.rowCount,
        lastInsertRowid: returningId && r.rows.length ? r.rows[0].id : undefined,
      }));
    },
  };
}

function exec(sql) {
  const client = als.getStore()?.client;
  return (client || pool).query(sql);
}

// Transaction helper: db.transaction(fn) returns a function; calling it runs
// fn on a dedicated client inside BEGIN…COMMIT (ROLLBACK on error, client
// always released). `fn` must be async and must await every query it makes —
// the ambient client (AsyncLocalStorage) makes all nested model calls part of
// the same transaction.
function transaction(fn) {
  return async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await als.run({ client }, () => fn(...args));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* client already dead */ }
      throw err;
    } finally {
      client.release();
    }
  };
}

function close() {
  return pool.end();
}

module.exports = { prepare, exec, transaction, close, pool };
