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
async function upload(metadata, adminName) {
  if (!metadata || !metadata.url) {
    throw httpError(400, 'Image URL is required.');
  }

  // Save the permanent ImgBB CDN URL to PostgreSQL via existing Media model
  return await Media.add({
    url: metadata.url,
    filename: metadata.filename || 'imgbb_upload',
    mime: 'image/jpeg', // Default or pass metadata.mime if available
    size: metadata.size || 0,
    width: metadata.width || 0,
    height: metadata.height || 0,
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
