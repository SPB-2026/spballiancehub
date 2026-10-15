const express = require('express');
const MemberService = require('../services/member.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public member directory — ?alliance=<key> picks the roster (defaults to the primary alliance)
router.get('/', asyncHandler(async (req, res) => {
  res.json(await MemberService.list(req.query.alliance));
}));

// The alliances shown as tabs on the Members page
router.get('/alliances', asyncHandler(async (req, res) => {
  res.json(await MemberService.listAlliances());
}));

module.exports = router;
