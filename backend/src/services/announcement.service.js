// Announcements: prioritized, expirable notices shown on the member-facing Home page.
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Announcements = require('../models/announcements');

async function list() {
  return Announcements.list();
}

async function create(input) {
  const title = v.str(input.title, { field: 'Title', max: 120 });
  const body = v.cleanText(input.body || '', { field: 'Message', max: 500, optional: true });
  const priority = v.int(input.priority ?? 0, { field: 'Priority', min: -100, max: 100 });
  const published = Boolean(input.published !== false && input.published !== 0);
  const expires_at = input.expires_at ? v.isoDateTime(input.expires_at, { field: 'Expiration', optional: true }) : null;
  return await Announcements.create({ title, body, priority, published, expires_at });
}

async function update(id, input) {
  const existing = await Announcements.findById(id);
  if (!existing) throw httpError(404, 'Announcement not found.');
  const fields = {};
  if (input.title !== undefined) fields.title = v.str(input.title, { field: 'Title', max: 120 });
  if (input.body !== undefined) fields.body = v.cleanText(input.body, { field: 'Message', max: 500, optional: true });
  if (input.priority !== undefined) fields.priority = v.int(input.priority, { field: 'Priority', min: -100, max: 100 });
  if (input.published !== undefined) fields.published = input.published ? 1 : 0;
  if (input.expires_at !== undefined) {
    fields.expires_at = input.expires_at ? v.isoDateTime(input.expires_at, { field: 'Expiration', optional: true }) : null;
  }
  return await Announcements.update(id, fields);
}

async function remove(id) {
  if (!(await Announcements.remove(id))) throw httpError(404, 'Announcement not found.');
  return { ok: true };
}

module.exports = { list, create, update, remove };
