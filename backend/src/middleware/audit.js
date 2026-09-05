// Audit middleware for /api/admin: records every successful mutation
// (POST/PUT/DELETE) in admin_activity. GETs are not logged.
// Logging failures must never break the request being audited.
// Direct admin access has no JWT (req.admin absent); audit still logs as
// direct-admin / id 0 so the trail remains useful without breaking prod.
const Activity = require('../models/activity');

function audit(req, res, next) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const parts = req.path.replace(/^\//, '').split('/').filter(Boolean);
    const section = parts[0] || 'dashboard';
    const id = parts[1];
    let action;
    let target = null;
    if (id && /^\d+$/.test(id)) {
      action = `${req.method} ${section} #${id}`;
      target = String(id);
    } else if (id) {
      action = `${req.method} ${section}/${id}`;
      target = String(id);
    } else {
      action = `${req.method} ${section}`;
    }
    // Direct access fallback: no session => system actor
    const adminId = (req.admin && Number.isFinite(req.admin.id)) ? req.admin.id : 0;
    const adminName = (req.admin && req.admin.name) || (req.admin && req.admin.username) || 'direct-admin';
    try {
      const ins = require('../config/db')
        .prepare(`INSERT INTO admin_activity (admin_id, admin_name, action, target, status) VALUES (?, ?, ?, ?, ?)`);
      // Fire-and-forget: the run is async; a failure must never surface as an
      // unhandled rejection (the audited request is already finished).
      // PostgreSQL implementation returns a Promise — catch rejects.
      // Also catch sync throws if pool/table missing.
      Promise.resolve(ins.run(adminId, adminName, action, target, res.statusCode)).catch((err) => {
        console.warn('[audit] insert failed (non-blocking):', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[audit] setup failed (non-blocking):', err && err.message ? err.message : err);
    }
  });
  next();
}

module.exports = { audit };
