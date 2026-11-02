const express = require('express');
const env = require('../config/env');
const Access = require('../services/access.service');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  // The frontend (Vercel) and backend (Render) are different domains, so the
  // cookie must be SameSite=None to be sent on cross-origin fetch calls —
  // unlike the admin cookie, which uses Lax and works there mainly because
  // that session is currently unused in practice.
  sameSite: env.IS_PROD ? 'none' : 'lax',
  secure: env.IS_PROD,
  maxAge: 365 * 24 * 3600 * 1000,
};

router.post('/verify', authLimiter, asyncHandler(async (req, res) => {
  const { token, name } = await Access.verifyMember(req.body || {});
  res.cookie('spb_member_token', token, COOKIE_OPTS);
  // Also returned in the body: browsers that block cross-site cookies (iPhone
  // Safari especially) never keep the cookie above, so the frontend stores
  // this in its own storage and sends it as an Authorization header instead.
  res.json({ ok: true, name, token });
}));

router.get('/status', asyncHandler(async (req, res) => {
  res.json(await Access.checkStatus(req));
}));

module.exports = router;
