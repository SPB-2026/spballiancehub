// Links to outside sites shown on the members' Resources page. Links are
// rendered as clickable addresses, so only real http(s) URLs are accepted
// (never javascript: or similar).
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Resources = require('../models/resources');

function parse(input) {
  const url = v.safeUrl(input.url, 'Link');
  if (!url) throw httpError(400, 'Link is required.');
  const order = v.int(input.sort_order, { field: 'Order', min: -1000, max: 1000, optional: true });
  return {
    title: v.str(input.title, { field: 'Title', max: 80 }),
    url,
    description: v.str(input.description, { field: 'Description', max: 240, optional: true }),
    category: v.str(input.category, { field: 'Category', max: 40, optional: true }),
    sort_order: order === null ? 0 : order,
    published: input.published === undefined ? true : Boolean(input.published),
  };
}

const listPublished = () => Resources.listPublished();
const listAll = () => Resources.listAll();

async function create(input) {
  return Resources.create(parse(input || {}));
}

async function update(id, input) {
  const existing = await Resources.findById(id);
  if (!existing) throw httpError(404, 'Link not found.');
  // Merge so a partial update (e.g. just toggling published) keeps the rest.
  return Resources.update(id, parse({ ...existing, ...(input || {}) }));
}

async function remove(id) {
  const existing = await Resources.findById(id);
  if (!existing) throw httpError(404, 'Link not found.');
  await Resources.remove(id);
  return { ok: true };
}

module.exports = { listPublished, listAll, create, update, remove };
