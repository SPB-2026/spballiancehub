// Tips & Tricks knowledge base.
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Articles = require('../models/articles');

const CATEGORIES = ['general', 'heroes', 'city', 'resources', 'combat', 'alliance', 'events', 'formations', 'equipment', 'f2p'];

// The model normalizes tags to a clean array on every read, but keep a
// defensive pass here too so service output is safe on any code path.
const asTags = (row) => (row ? { ...row, tags: Articles.normalizeTags(row.tags) } : row);

// Tags arrive as a CSV string from the admin form or (defensively) as an
// array — coerce to the canonical CSV before validation.
const tagsInput = (raw) => (Array.isArray(raw) ? raw.join(', ') : raw);

async function list(category = null) {
  return (await Articles.publishedList(category)).map(asTags);
}

async function get(id) {
  const row = await Articles.publishedById(id);
  if (!row) throw httpError(404, 'Article not found or unpublished.');
  return asTags(row);
}

async function create(input) {
  const title = v.str(input.title, { field: 'Title', max: 160 });
  const category = v.oneOf(input.category || 'general', CATEGORIES, 'Category');
  const body = v.cleanText(input.body, { field: 'Content', max: 20000 });
  const tags = v.cleanText(tagsInput(input.tags) || '', { field: 'Tags', max: 120, optional: true });
  const published = Boolean(input.published);
  const cover = typeof input.cover === 'string' && input.cover.trim() ? input.cover.trim() : null;
  if (cover && !cover.startsWith('/uploads/')) throw httpError(400, 'Tip image must come from the Media library.');
  return await Articles.create({ title, category, body, tags, published, cover });
}

async function update(id, input) {
  const existing = await Articles.findById(id);
  if (!existing) throw httpError(404, 'Article not found.');
  const fields = {};
  if (input.title !== undefined) fields.title = v.str(input.title, { field: 'Title', max: 160 });
  if (input.category !== undefined) fields.category = v.oneOf(input.category, CATEGORIES, 'Category');
  if (input.body !== undefined) fields.body = v.cleanText(input.body, { field: 'Content', max: 20000 });
  if (input.tags !== undefined) fields.tags = v.cleanText(tagsInput(input.tags), { field: 'Tags', max: 120, optional: true });
  if (input.published !== undefined) {
    fields.published = input.published ? 1 : 0;
    if (input.published && !existing.published) fields.published_at = new Date().toISOString();
    if (!input.published) fields.published_at = null;
  }
  if (input.cover !== undefined) {
    fields.cover = input.cover ? String(input.cover).trim() : null;
    if (fields.cover && !fields.cover.startsWith('/uploads/')) throw httpError(400, 'Tip image must come from the Media library.');
  }
  const row = await Articles.update(id, fields);
  return asTags(row);
}

async function remove(id) {
  if (!(await Articles.remove(id))) throw httpError(404, 'Article not found.');
  return { ok: true };
}

module.exports = { list, get, create, update, remove, CATEGORIES };
