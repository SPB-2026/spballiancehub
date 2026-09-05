// CORS for production: allow Vercel frontend via FRONTEND_URL (comma-separated).
// Never uses wildcard '*'. Credentials are supported (cookies + Authorization).
// In development, localhost origins are automatically allowed.
const env = require('../config/env');

function parseAllowedOrigins() {
  const raw = String(env.FRONTEND_URL || '').trim();
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Dev origins — only when not in production, so production is strictly
  // limited to FRONTEND_URL.
  if (!env.IS_PROD) {
    const dev = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    for (const o of dev) if (!list.includes(o)) list.push(o);
  }

  return list;
}

function isAllowedOrigin(origin, allowed) {
  if (!origin) return false;
  // Exact match
  if (allowed.includes(origin)) return true;
  // Wildcard pattern support: https://*.vercel.app -> regex
  for (const pat of allowed) {
    if (pat.includes('*')) {
      const esc = pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const re = new RegExp('^' + esc + '$');
      if (re.test(origin)) return true;
    }
  }
  return false;
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = parseAllowedOrigins();

  // Always vary on Origin so caches don't mix CORS / no-CORS responses.
  res.setHeader('Vary', 'Origin');

  const allowedForThisRequest = origin && isAllowedOrigin(origin, allowed);

  if (allowedForThisRequest) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
    res.setHeader('Access-Control-Max-Age', '600');
  } else if (allowed.length === 0 && env.IS_PROD && origin) {
    // In production with no FRONTEND_URL configured, CORS will block
    // every cross-origin request. Log once per process to guide ops.
    if (!corsMiddleware._warned) {
      corsMiddleware._warned = true;
      console.warn(
        '[cors] FRONTEND_URL is not set — all cross-origin requests will be blocked. ' +
        'Set FRONTEND_URL to your Vercel URL (e.g. https://your-app.vercel.app) on Render.'
      );
    }
  }

  if (req.method === 'OPTIONS') {
    // Preflight: respond immediately. If origin is allowed we already set ACAO.
    // If not allowed we respond 204 without ACAO so the browser blocks.
    return res.sendStatus(204);
  }

  next();
}

module.exports = corsMiddleware;
