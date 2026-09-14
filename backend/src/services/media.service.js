// Media library: uploads images to ImgBB CDN and records metadata in DB.
const { httpError } = require('../middleware/errors');
const img = require('../utils/image');
const Media = require('../models/media');

async function list() {
  return Media.list();
}

async function upload(file, adminName) {
  if (!file || !file.buffer) {
    throw httpError(400, 'No image file uploaded or file buffer is missing.');
  }

  img.assertAllowedImage(file);
  const dims = img.assertDimensions(file.buffer, { min: 32, max: 2048 });

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw httpError(500, 'IMGBB_API_KEY environment variable is missing on server.');
  }

  // Convert image buffer to base64 string
  const base64Image = file.buffer.toString('base64');

  // Use URLSearchParams to ensure payload reaches ImgBB as URL-encoded form data
  const payload = new URLSearchParams();
  payload.append('image', base64Image);

  // Send request to ImgBB
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const result = await response.json();

  if (!result.success) {
    console.error('[spb] ImgBB error:', result);
    throw httpError(500, result.error?.message || 'ImgBB upload failed.');
  }

  const imgData = result.data;

  // Save permanent ImgBB CDN URL to database via Media model
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

  await Media.remove(id);
  return { ok: true };
}

module.exports = { list, upload, remove };
