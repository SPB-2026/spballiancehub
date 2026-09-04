const express = require('express');
const Leaderboard = require('../services/leaderboard.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const metric = req.query.metric === 'contributions' ? 'contributions' : 'score';
  res.json(await Leaderboard.rows(metric));
}));

module.exports = router;
