const express = require('express');
const NewsService = require('../services/news.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await NewsService.list());
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await NewsService.get(Number(req.params.id)));
}));

module.exports = router;
