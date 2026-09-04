// Session auth middleware.
// Admins authenticate with username + password. Public site requires no login.
// Sessions are JWTs in httpOnly cookies. All authorization decisions happen here and in
// requireAdmin — frontend link hiding is cosmetic only.
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const db = require('../config/db');

function signToken(payload, hours) {
  // jti: a unique id per session. Without it, two logins of the same user in
  // the same second produce an identical JWT string — which would let a
  // logout revoke the *next* session's token too.
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: hours * 3600, jwtid: crypto.randomUUID() });
}

// ── Session revocation (real server-side invalidation on logout) ────────────
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function isRevoked(token) {
  try {
    const row = await db.prepare('SELECT 1 FROM revoked_tokens WHERE token_hash = ?').get(tokenHash(token));
    return Boolean(row);
  } catch (err) {
    console.error('[auth] revoked_tokens check failed (fail-open, treating as not revoked):', err.message);
    return false; // fail-open if the table is somehow unavailable
  }
}

async function revokeToken(token) {
  let until = Date.now() + 31 * 24 * 3600 * 1000; // upper bound of any session TTL
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    if (payload && Number.isFinite(payload.exp)) until = payload.exp * 1000;
  } catch { /* unparseable token → upper bound */ }
  // Keep the table small: drop entries that have already expired.
  await db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(Date.now());
  await db.prepare('INSERT INTO revoked_tokens (token_hash, expires_at) VALUES (?, ?) ON CONFLICT (token_hash) DO NOTHING').run(tokenHash(token), until);
}

function readToken(req) {
  // Session token travels in an httpOnly cookie (primary) or an Authorization
  // header (fallback for environments where third-party cookies are blocked).
  const header = req.get('Authorization') || '';
  if (header.startsWith('Bearer ') && header.length > 7) return header.slice(7);
  return req.cookies ? req.cookies.spb_token : null;
}

async function resolveAuth(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return { auth: null };
  }
  // Revoked sessions (logged out) are rejected even though the JWT
  // itself is still cryptographically valid.
  if (await isRevoked(token)) return { auth: null };

  if (payload.type === 'admin') {
    const row = await db.prepare('SELECT id, username, email, name FROM admins WHERE id = ?').get(payload.id);
    if (!row) return { auth: null };
    return { auth: payload, admin: row };
  }
  return { auth: null };
}

function attachUser(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  resolveAuth(token)
    .then(({ auth, admin }) => {
      req.auth = auth;
      if (admin) req.admin = admin;
      next();
    })
    .catch(() => next()); // never let an auth check take the request down
}

function requireAuth(req, res, next) {
  if (!req.auth) {
    // Diagnostic: which token channel did the client present? Lets us tell a
    // stale/absent cookie apart from a stripped Authorization header.
    const via = ((req.get('Authorization') || '').startsWith('Bearer ') ? 'bearer' : (req.cookies && req.cookies.spb_token ? 'cookie' : 'none'));
    console.log(`[auth] 401 ${req.method} ${req.originalUrl} token-via=${via} ua=${String(req.get('user-agent') || '').slice(0, 40)}`);
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.admin) return res.status(403).json({ error: 'Admin access required.' });
  next();
}

module.exports = { signToken, readToken, attachUser, requireAuth, requireAdmin, revokeToken };
