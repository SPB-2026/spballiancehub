const express = require('express');
const GiftService = require('../services/gift.service');
const { authLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public gift code list and redemption — no member login required
router.get('/list', asyncHandler(async (req, res) => res.json(await GiftService.listPublic())));

router.post('/redeem', authLimiter, asyncHandler(async (req, res) => {
  // Public redemption — no member association (optional code query param for backwards compat)
  res.json(await GiftService.redeemPublic((req.body || {}).code));
}));

router.get('/my', asyncHandler(async (req, res) => {
  // No member session — return empty list for public visitors
  res.json([]);
}));

module.exports = router;
