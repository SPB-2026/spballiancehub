const express = require('express');
const ResourceService = require('../services/resource.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Public list of published links (the page itself sits behind the member gate)
router.get('/', asyncHandler(async (req, res) => res.json(await ResourceService.listPublished())));

module.exports = router;
