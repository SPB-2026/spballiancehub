const express = require('express');
const ArticleService = require('../services/article.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json({ categories: ArticleService.CATEGORIES, articles: await ArticleService.list(req.query.category || null) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await ArticleService.get(Number(req.params.id)));
}));

module.exports = router;
