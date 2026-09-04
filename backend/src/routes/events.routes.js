const express = require('express');
const EventService = require('../services/event.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  res.json(await EventService.list(status || null));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await EventService.get(Number(req.params.id)));
}));

module.exports = router;
