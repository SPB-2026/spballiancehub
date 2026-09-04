// Upload validation helpers: magic-byte type checks, dimension parsing, safe filenames.
const crypto = require('crypto');
const path = require('path');
const errors = require('../middleware/errors');

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function assertAllowedImage(file) {
  if (!file || !file.originalname || !file.mimetype) throw errors.httpError(400, 'No image file received.');
  if (!ALLOWED_TYPES[file.mimetype]) throw errors.httpError(400, 'Only JPG, PNG or WebP images are allowed.');
  const buf = file.buffer;
  if (!buf || buf.length === 0) throw errors.httpError(400, 'The uploaded image is empty.');
  if (buf.length > 2 * 1024 * 1024) throw errors.httpError(400, 'Image must be 2 MB or smaller.');

  // Magic bytes
  const head = buf.slice(0, 12).toString('hex');
  if (file.mimetype === 'image/jpeg' && !head.startsWith('ffd8ff')) throw errors.httpError(400, 'File is not a valid JPEG.');
  if (file.mimetype === 'image/png' && !head.startsWith('89504e47')) throw errors.httpError(400, 'File is not a valid PNG.');
  if (file.mimetype === 'image/webp' && !head.startsWith('52494646')) throw errors.httpError(400, 'File is not a valid WebP.');
}

function imageDimensions(buf) {
  // PNG: IHDR width/height at bytes 16..24
  if (buf.length > 24 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // WebP: VP8 (lossy), VP8L (lossless) or VP8X
  if (buf.length > 30 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    const fourcc = buf.slice(12, 16).toString('ascii');
    if (fourcc === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (fourcc === 'VP8L') {
      const b = buf.slice(21, 25);
      const w = (b[1] & 0x3f) | (b[2] << 8) | ((b[3] & 0xf) << 16);
      const h = ((b[3] & 0xf0) << 4) | (b[4] << 8) | ((b[5] & 0x7f) << 16);
      return { width: w + 1, height: h + 1 };
    }
    if (fourcc === 'VP8X') {
      return { width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)) };
    }
  }
  // JPEG: scan for SOF0..SOF2 markers
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) { off += 1; continue; }
      const marker = buf[off + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      off += 2 + buf.readUInt16BE(off + 2);
    }
  }
  return null;
}

function assertDimensions(buf, { min = 64, max = 2048 } = {}) {
  const dims = imageDimensions(buf);
  if (!dims) throw errors.httpError(400, 'Could not read image dimensions.');
  if (dims.width < min || dims.height < min) throw errors.httpError(400, `Image must be at least ${min}×${min}px.`);
  if (dims.width > max || dims.height > max) throw errors.httpError(400, `Image must be at most ${max}×${max}px.`);
  return dims;
}

// Deterministic safe filename: <purpose>-<random>.<ext> — never derived from user input.
function safeFilename(purpose, ext) {
  return `${purpose}-${crypto.randomBytes(10).toString('hex')}.${ext}`;
}

function extFor(mimetype) {
  return ALLOWED_TYPES[mimetype] || 'jpg';
}

module.exports = { assertAllowedImage, imageDimensions, assertDimensions, safeFilename, extFor, path };
