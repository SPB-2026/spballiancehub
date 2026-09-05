// SPB Alliance Hub — server entry point.
const env = require('./src/config/env');
const app = require('./src/app');
const { startGiftFetchJobs } = require('./src/jobs/giftCodeFetch');
const db = require('./src/config/db');

// Reaching here means the PostgreSQL pool was created successfully
// (db.js throws at require time if DATABASE_URL is missing).

async function start() {

  // Production diagnostics — do not crash, just warn clearly.
  if (env.IS_PROD) {
    if (!env.FRONTEND_URL) {
      console.warn('[spb] WARNING: FRONTEND_URL is not set — Vercel frontend will be blocked by CORS. Set FRONTEND_URL=https://<your-app>.vercel.app on Render.');
    } else {
      console.log(`[spb] CORS allowed origins: ${env.FRONTEND_URL}`);
    }
    if (!process.env.JWT_SECRET) {
      console.warn('[spb] WARNING: JWT_SECRET is not set — using insecure dev fallback. Set a long random value in production.');
    }
    if (!env.DATABASE_URL) {
      console.error('[spb] DATABASE_URL is not set — server will fail to start.');
    }
  }

  const server = app.listen(env.PORT, env.HOST, () => {
    if (env.IS_PROD) {
      console.log(`[spb] Production server listening on ${env.HOST}:${env.PORT} (health: /api/health)`);
    } else {
      console.log(`[spb] API listening on http://${env.HOST}:${env.PORT} (dev)`);
      console.log(`[spb] Frontend dev server → open http://localhost:5173 in your browser (run "npm run dev")`);
    }
  });

  startGiftFetchJobs();

  const shutdown = (signal) => {
    console.log(`[spb] ${signal} — shutting down…`);
    server.close(() => db.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref(); // hard stop if connections hang
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  // Full diagnostics (message + code/hint + stack). Safe: pg errors never
  // carry the connection string or credentials.
  if (err && typeof err === 'object') {
    console.error('[spb] startup failed:', err.message);
    console.error('[spb] code:', err.code);
    console.error('[spb] hint:', err.hint);
    console.error('[spb] stack:', err.stack);
  } else {
    console.error('[spb] startup failed (non-Error):', err);
  }
  process.exit(1);
});
