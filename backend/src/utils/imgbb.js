// Uploads an image buffer to ImgBB and returns a persistent, direct-linkable
// URL. Replaces local disk storage, which does not survive redeploys on
// hosts with an ephemeral filesystem (e.g. Render's free tier) — ImgBB
// hosts the file for us instead, so the URL keeps working across deploys.
//
// Requires IMGBB_API_KEY (free key from https://api.imgbb.com) set as an
// environment variable — never hard-code it.
//
// Note: ImgBB's free API has no reliable server-side delete endpoint (the
// delete_url it returns is a browser page, not something a backend can
// call). Removing an image from the site removes it from the database and
// stops it being served here, but the file itself stays hosted on ImgBB.
const env = require('../config/env');
const { httpError } = require('../middleware/errors');

async function uploadToImgbb(buffer, { filename = 'image' } = {}) {
  const apiKey = env.IMGBB_API_KEY;
  if (!apiKey) {
    throw httpError(500, 'Image hosting is not configured. Set IMGBB_API_KEY on the server.', { expose: true });
  }

  if (typeof fetch === 'undefined' || typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    // fetch/FormData/Blob are built into Node 18+. If they're missing, the
    // server is running an older Node version than this project requires
    // (see package.json "engines").
    throw httpError(500, 'Image uploads require Node.js 18 or newer on the server. Check your hosting platform\'s Node version setting.', { expose: true });
  }

  const form = new FormData();
  form.append('key', apiKey);
  form.append('image', new Blob([buffer]), filename);

  let res;
  try {
    res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  } catch (e) {
    throw httpError(502, `Could not reach the image host: ${e.message || 'network error'}.`, { expose: true });
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw httpError(502, 'The image host returned an unexpected response.', { expose: true });
  }

  if (!res.ok || !json || json.success !== true) {
    const msg = json?.error?.message || `Image host error (HTTP ${res.status}).`;
    throw httpError(502, `Image upload failed: ${msg}`, { expose: true });
  }

  const d = json.data || {};
  const url = d.display_url || d.url || d.image?.url;
  if (!url) throw httpError(502, 'Image host did not return a usable URL.', { expose: true });

  return {
    url,
    width: Number(d.width) || null,
    height: Number(d.height) || null,
    size: Number(d.size) || buffer.length,
  };
}

module.exports = { uploadToImgbb };
