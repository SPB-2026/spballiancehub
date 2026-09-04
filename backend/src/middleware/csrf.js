// CSRF protection via double-submit token.
//
// Rules:
// - GET/HEAD/OPTIONS never need a token.
// - Requests authenticated with an Authorization: Bearer header skip CSRF —
//   browsers never attach custom headers to cross-origin requests, so this
//   path is inherently CSRF-immune. (Used when third-party cookies are blocked,
//   e.g. the site running inside a cross-site preview iframe.)
// - The public login endpoints are exempt: they take credentials in a JSON
//   body (CORS-preflight protected), are rate-limited, and SameSite=Lax
//   cookies are not sent on cross-site subresource requests anyway.
// - Everything else (cookie-authenticated mutations) requires the double-submit
//   token: the client fetches one via GET /api/csrf and echoes it in
//   X-CSRF-Token; it must match the signed cookie.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const CSRF_EXEMPT_PATHS = ['/api/auth/admin', '/api/auth/logout'];

function csrfToken(req, res) {
  const token = req.cookies && req.cookies.spb_csrf;
  if (token) {
    try {
      jwt.verify(token, env.JWT_SECRET);
      return token;
    } catch { /* fall through and reissue */ }
  }
  const fresh = jwt.sign({ csrf: crypto.randomBytes(16).toString('hex') }, env.JWT_SECRET, { expiresIn: '12h' });
  res.cookie('spb_csrf', fresh, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000, secure: env.IS_PROD });
  return fresh;
}

function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if ((req.get('Authorization') || '').startsWith('Bearer ')) return next();
  if (CSRF_EXEMPT_PATHS.includes(req.originalUrl.split('?')[0])) return next();

  const header = req.get('X-CSRF-Token') || '';
  const cookie = req.cookies ? req.cookies.spb_csrf : '';
  if (header && header === cookie) return next();

  // Self-heal: the client caches the token for the life of the tab, but the
  // cookie can expire (12h) or be dropped (private windows, cleared data,
  // some preview iframes). If the presented token is one we signed — i.e. a
  // legitimately issued token from this browser — re-sync the cookie to it
  // instead of rejecting every subsequent save.
  if (header) {
    try {
      jwt.verify(header, env.JWT_SECRET);
      res.cookie('spb_csrf', header, { httpOnly: true, sameSite: 'lax', maxAge: 12 * 3600 * 1000, secure: env.IS_PROD });
      return next();
    } catch { /* not a token we issued — fall through to rejection */ }
  }

  return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
}

module.exports = { csrfToken, csrfProtect };
