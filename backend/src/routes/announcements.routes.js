const express = require('express');
const Announcements = require('../models/announcements');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Member-facing: published, unexpired announcements, highest priority first.
// Capped at 3 — the Home page renders a compact board.
router.get('/', asyncHandler(async (req, res) => {
  res.json({ announcements: await Announcements.active(3) });
}));

module.exports = router;
