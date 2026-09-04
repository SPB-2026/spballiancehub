// Audit middleware for /api/admin: records every successful mutation
// (POST/PUT/DELETE) in admin_activity. GETs are not logged.
// Logging failures must never break the request being audited.
const Activity = require('../models/activity');

function audit(req, res, next) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.admin) return;
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
    try {
      const ins = require('../config/db')
        .prepare(`INSERT INTO admin_activity (admin_id, admin_name, action, target, status) VALUES (?, ?, ?, ?, ?)`);
      // Fire-and-forget: the run is async; a failure must never surface as an
      // unhandled rejection (the audited request is already finished).
      Promise.resolve(ins.run(req.admin.id, req.admin.name, action, target, res.statusCode)).catch(() => {});
    } catch {
      /* never break the audited request */
    }
  });
  next();
}

module.exports = { audit };
