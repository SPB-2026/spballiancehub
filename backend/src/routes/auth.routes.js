const express = require('express');
const env = require('../config/env');
const Auth = require('../services/auth.service');
const { requireAuth, readToken, revokeToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const db = require('../config/db');

const router = express.Router();

// Append an entry to the admin audit trail (never breaks the request).
function logActivity(adminId, adminName, action) {
  try {
    db.prepare(`INSERT INTO admin_activity (admin_id, admin_name, action, target, status) VALUES (?, ?, ?, NULL, ?)`)
      .run(adminId, adminName, action, 200)
      .catch(() => {});
  } catch { /* ignore */ }
}

router.post('/logout', asyncHandler(async (req, res) => {
  // Invalidate the presented session on the server so the old cookie/token
  // cannot be replayed (browser Back, another tab, or a stored session).
  const token = readToken(req);
  if (token) { try { await revokeToken(token); } catch { /* ignore */ } }
  if (req.admin) logActivity(req.admin.id, req.admin.name, 'ADMIN LOGOUT');
  res.clearCookie('spb_token', { httpOnly: true, sameSite: 'lax', secure: env.IS_PROD });
  res.json(Auth.logout());
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ type: 'admin', user: { id: req.admin.id, name: req.admin.name, username: req.admin.username } });
});

module.exports = router;
