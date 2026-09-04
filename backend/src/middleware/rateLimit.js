// Small fixed-window in-memory rate limiter.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 50, message = 'Too many requests, slow down.' } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Stricter limiter for credential endpoints.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts. Try again in 15 minutes.' });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 240 });

module.exports = { rateLimit, authLimiter, apiLimiter };
