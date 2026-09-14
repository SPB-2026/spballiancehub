// Media library: uploads images to ImgBB CDN and records metadata in DB.
const FormData = require('form-data');
const { httpError } = require('../middleware/errors');
const img = require('../utils/image');
const Media = require('../models/media');

async function list() {
  return Media.list();
}

async function upload(file, adminName) {
  img.assertAllowedImage(file);
  const dims = img.assertDimensions(file.buffer, { min: 32, max: 2048 });

  // 1. Prepare Base64 string for ImgBB API
  const base64Image = file.buffer.toString('base64');

  const formData = new FormData();
  formData.append('image', base64Image);

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw httpError(500, 'IMGBB_API_KEY environment variable is missing on server.');
  }

  // 2. Upload image to ImgBB
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (!result.success) {
    throw httpError(500, result.error?.message || 'ImgBB upload failed.');
  }

  const imgData = result.data;

  // 3. Save permanent ImgBB CDN URL to PostgreSQL database via existing Media model
  return await Media.add({
    url: imgData.url,           // Permanent link (e.g. https://i.ibb.co/...)
    filename: file.originalname,
    mime: file.mimetype,
    size: imgData.size || file.buffer.length,
    width: dims.width,
    height: dims.height,
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

  // Delete DB record (file remains on ImgBB CDN without breaking local disk)
  await Media.remove(id);
  return { ok: true };
}

module.exports = { list, upload, remove };
