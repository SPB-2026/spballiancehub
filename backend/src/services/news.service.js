// News: public read access to published items, full CRUD for admins.
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const img = require('../utils/image');
const News = require('../models/news');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const CATEGORIES = ['alliance', 'war', 'tournament', 'update', 'announcement', 'community'];

async function list() {
  return News.publishedList();
}

async function get(id) {
  const row = await News.publishedById(id);
  if (!row) throw httpError(404, 'Article not found or unpublished.');
  return row;
}

async function create(input, author) {
  const title = v.str(input.title, { field: 'Title', max: 160 });
  const category = v.oneOf(input.category || 'alliance', CATEGORIES, 'Category');
  const cover = input.cover || null;
  const summary = v.cleanText(input.summary, { field: 'Summary', max: 400, optional: true });
  const body = v.cleanText(input.body, { field: 'Content', max: 20000 });
  const published = Boolean(input.published);
  const featured = Boolean(input.featured);
  return await News.create({ title, category, cover, summary, body, published, author: author || 'SPB Command', featured });
}

async function update(id, input, author) {
  const existing = await News.findById(id);
  if (!existing) throw httpError(404, 'Article not found.');
  const fields = {};
  if (input.title !== undefined) fields.title = v.str(input.title, { field: 'Title', max: 160 });
  if (input.category !== undefined) fields.category = v.oneOf(input.category, CATEGORIES, 'Category');
  if (input.cover !== undefined) fields.cover = input.cover || existing.cover;
  if (input.summary !== undefined) fields.summary = v.cleanText(input.summary, { field: 'Summary', max: 400, optional: true });
  if (input.body !== undefined) fields.body = v.cleanText(input.body, { field: 'Content', max: 20000 });
  if (input.published !== undefined) {
    fields.published = input.published ? 1 : 0;
    if (input.published && !existing.published) fields.published_at = new Date().toISOString();
    if (!input.published) fields.published_at = null;
  }
  if (input.author !== undefined) fields.author = v.str(input.author, { field: 'Author', max: 80, optional: true });
  if (input.featured !== undefined) fields.featured = input.featured ? 1 : 0;
  return await News.update(id, fields);
}

async function remove(id) {
  if (!(await News.remove(id))) throw httpError(404, 'Article not found.');
  return { ok: true };
}

function uploadCover(file) {
  img.assertAllowedImage(file);
  img.assertDimensions(file.buffer, { min: 128, max: 2048 });
  const dir = path.join(UPLOAD_DIR, 'news');
  fs.mkdirSync(dir, { recursive: true });
  const filename = img.safeFilename('cover', img.extFor(file.mimetype));
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/news/${filename}`;
}

module.exports = { list, get, create, update, remove, uploadCover, CATEGORIES };
