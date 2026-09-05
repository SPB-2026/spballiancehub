// Express application assembly: middleware order matters.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { securityHeaders, noStore } = require('./middleware/security');
const { audit } = require('./middleware/audit');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Lightweight access log: method, path, status, latency, UA prefix.
app.use((req, res, next) => {
  const t0 = Date.now();

  res.on('finish', () => {
    console.log(
      `[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms) ua=${String(req.get('user-agent') || '').slice(0, 44)}`
    );
  });

  next();
});

// Static uploads (avatars, covers, logo) — anchored to project root.
const ROOT = path.resolve(__dirname, '..', '..');
const UPLOADS_ROOT = path.join(ROOT, 'uploads');

fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    maxAge: '7d',
    immutable: false,
  })
);

// API
app.use(
  '/api',
  securityHeaders,
  noStore,
  express.json({ limit: '250kb' }),
  cookieParser()
);

// Rate limit API requests.
app.use('/api', apiLimiter);

// Public API routes — no authentication or CSRF required.
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/members', require('./routes/members.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/news', require('./routes/news.routes'));
app.use('/api/articles', require('./routes/articles.routes'));
app.use('/api/gifts', require('./routes/gifts.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/announcements', require('./routes/announcements.routes'));

// Admin routes — direct access, no login required.
// `audit` records successful mutations in admin_activity.
app.use('/api/admin', audit, require('./routes/admin.routes'));

// SPA fallback (production build)
const DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1d' }));

  app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
