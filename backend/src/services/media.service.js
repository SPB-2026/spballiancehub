// Media library: accepts direct ImgBB CDN metadata and records it in the DB.
const { httpError } = require('../middleware/errors');
const Media = require('../models/media');

async function list() {
  return Media.list();
}

/**
 * Saves ImgBB metadata to PostgreSQL database
 * @param {Object} metadata - { url, filename, width, height, size }
 * @param {string} adminName - Name of uploading admin
 */
async function upload(body, adminName) {
  // Ensure req.body contains the url property from frontend
  const url = body?.url;
  const filename = body?.filename || 'imgbb_upload';
  const width = Number(body?.width) || 0;
  const height = Number(body?.height) || 0;
  const size = Number(body?.size) || 0;

  if (!url) {
    throw httpError(400, 'Image URL is required.');
  }

  // Insert the ImgBB CDN URL record into PostgreSQL
  return await Media.add({
    url,
    filename,
    mime: 'image/jpeg',
    size,
    width,
    height,
    uploaded_by: adminName || null,
  });
}

async function remove(id) {
  const row = await Media.findById(id);
  if (!row) throw httpError(404, 'Media item not found.');

  const refs = await Media.references(row.url);
  if (refs.length > 0) {
    throw httpError(409, `This image is in use by: ${refs.join(', ')}. Remove it from that content first.`);
  }

  await Media.remove(id);
  return { ok: true };
}

module.exports = { list, upload, remove };
