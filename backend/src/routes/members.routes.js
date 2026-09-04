const express = require('express');
const MemberService = require('../services/member.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public member directory — no login required
router.get('/', asyncHandler(async (req, res) => {
  res.json(await MemberService.list());
}));

module.exports = router;
