// Media library: admin uploads images once and reuses them across content
// (news covers, event images, tips covers, Home banner, favicon, logo).
const { httpError } = require('../middleware/errors');
const img = require('../utils/image');
const { uploadToImgbb } = require('../utils/imgbb');
const Media = require('../models/media');

async function list() {
  return Media.list();
}

async function upload(file, adminName) {
  img.assertAllowedImage(file);
  const localDims = img.assertDimensions(file.buffer, { min: 32, max: 2048 });
  const filename = img.safeFilename('img', img.extFor(file.mimetype));
  const hosted = await uploadToImgbb(file.buffer, { filename });
  return await Media.add({
    url: hosted.url,
    filename,
    mime: file.mimetype,
    size: hosted.size || file.buffer.length,
    width: hosted.width || localDims.width,
    height: hosted.height || localDims.height,
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
  // The hosted file itself stays on ImgBB (no reliable server-side delete —
  // see utils/imgbb.js) — removing the database row is what takes it off
  // the site.
  await Media.remove(id);
  return { ok: true };
}

module.exports = { list, upload, remove };
