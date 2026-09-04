// Alliance events — also drive the calendar page (a single events table is the
// source of truth for both, avoiding duplicate data).
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Events = require('../models/events');

const CATEGORIES = ['war', 'tournament', 'social', 'maintenance', 'other'];

// Member-facing list: published events only (drives the Events page + calendar).
async function list(status = null) {
  const all = await Events.publicList();
  return status ? all.filter((e) => e.status === status) : all;
}

// Admin list: every event including unpublished.
async function adminList() {
  return Events.list();
}

async function get(id) {
  const row = await Events.findById(id);
  if (!row) throw httpError(404, 'Event not found.');
  return row;
}

function imageUrl(value) {
  if (value === '' || value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s.startsWith('/uploads/')) throw httpError(400, 'Event image must come from the Media library.');
  return s;
}

async function create(input) {
  const title = v.str(input.title, { field: 'Event name', max: 120 });
  const description = v.cleanText(input.description, { field: 'Description', max: 2000, optional: true });
  const category = v.oneOf(input.category || 'tournament', CATEGORIES, 'Category');
  const starts_at = v.isoDateTime(input.starts_at, { field: 'Start date/time' });
  const ends_at = v.isoDateTime(input.ends_at, { field: 'End date/time' });
  const location = v.str(input.location || '', { field: 'Location', max: 120, optional: true });
  const image = imageUrl(input.image);
  const priority = v.int(input.priority ?? 0, { field: 'Priority', min: -100, max: 100 });
  const published = input.published !== false && input.published !== 0;
  if (Date.parse(ends_at) <= Date.parse(starts_at)) throw httpError(400, 'End time must be after start time.');
  return await Events.create({ title, description, category, starts_at, ends_at, location, image, priority, published });
}

async function update(id, input) {
  const existing = await Events.findById(id);
  if (!existing) throw httpError(404, 'Event not found.');
  const fields = {};
  if (input.title !== undefined) fields.title = v.str(input.title, { field: 'Event name', max: 120 });
  if (input.description !== undefined) fields.description = v.cleanText(input.description, { field: 'Description', max: 2000, optional: true });
  if (input.category !== undefined) fields.category = v.oneOf(input.category, CATEGORIES, 'Category');
  if (input.starts_at !== undefined) fields.starts_at = v.isoDateTime(input.starts_at, { field: 'Start date/time' });
  if (input.ends_at !== undefined) fields.ends_at = v.isoDateTime(input.ends_at, { field: 'End date/time' });
  if (input.location !== undefined) fields.location = v.str(input.location, { field: 'Location', max: 120, optional: true });
  if (input.image !== undefined) fields.image = imageUrl(input.image);
  if (input.priority !== undefined) fields.priority = v.int(input.priority, { field: 'Priority', min: -100, max: 100 });
  if (input.published !== undefined) fields.published = input.published ? 1 : 0;
  const nextStart = fields.starts_at || existing.starts_at;
  const nextEnd = fields.ends_at || existing.ends_at;
  if (Date.parse(nextEnd) <= Date.parse(nextStart)) throw httpError(400, 'End time must be after start time.');
  return await Events.update(id, fields);
}

async function remove(id) {
  if (!(await Events.remove(id))) throw httpError(404, 'Event not found.');
  return { ok: true };
}

module.exports = { list, adminList, get, create, update, remove, CATEGORIES };
