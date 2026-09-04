// Media library: admin uploads images once and reuses them across content
// (news covers, event images, tips covers, Home banner, favicon, logo).
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { httpError } = require('../middleware/errors');
const img = require('../utils/image');
const Media = require('../models/media');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

async function list() {
  return Media.list();
}

async function upload(file, adminName) {
  img.assertAllowedImage(file);
  const dims = img.assertDimensions(file.buffer, { min: 32, max: 2048 });
  const dir = path.join(UPLOAD_DIR, 'media');
  fs.mkdirSync(dir, { recursive: true });
  const filename = img.safeFilename('img', img.extFor(file.mimetype));
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  const url = `/uploads/media/${filename}`;
  // If an identical entry exists (re-upload), replace the file reference instead of duplicating.
  return await Media.add({ url, filename, mime: file.mimetype, size: file.buffer.length, width: dims.width, height: dims.height, uploaded_by: adminName || null });
}

async function remove(id) {
  const row = await Media.findById(id);
  if (!row) throw httpError(404, 'Media item not found.');
  const refs = await Media.references(row.url);
  if (refs.length > 0) {
    throw httpError(409, `This image is in use by: ${refs.join(', ')}. Remove it from that content first.`);
  }
  await Media.remove(id);
  const file = path.join(UPLOAD_DIR, 'media', row.filename);
  fs.promises.unlink(file).catch(() => {});
  return { ok: true };
}

module.exports = { list, upload, remove };
