const express = require('express');
const SettingsService = require('../services/settings.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public display settings only (no sensitive data) — needed by guests for the
// footer, maintenance-mode notice and Home page content.
router.get('/public', asyncHandler(async (req, res) => {
  res.json(await SettingsService.publicSettings());
}));

module.exports = router;
