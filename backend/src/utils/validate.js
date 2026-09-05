// Small input validation helpers used across services.
const errors = require('../middleware/errors');

function str(value, { field = 'value', min = 1, max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw errors.httpError(400, `${field} is required.`);
  }
  const s = String(value).trim();
  if (s.length < min || s.length > max) throw errors.httpError(400, `${field} must be ${min}–${max} characters.`);
  return s;
}

function int(value, { field = 'value', min = 0, max = 1_000_000_000, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw errors.httpError(400, `${field} is required.`);
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw errors.httpError(400, `${field} must be a whole number.`);
  if (n < min || n > max) throw errors.httpError(400, `${field} must be between ${min} and ${max}.`);
  return n;
}

function oneOf(value, allowed, field = 'value') {
  if (!allowed.includes(value)) throw errors.httpError(400, `${field} must be one of: ${allowed.join(', ')}.`);
  return value;
}

// Kingshot Game User IDs are exactly 9 digits — no more, no less.
function gameUserId(value, { field = 'Game User ID' } = {}) {
  const s = String(value === undefined || value === null ? '' : value).trim();
  if (!/^\d{9}$/.test(s)) throw errors.httpError(400, `${field} must be exactly 9 digits (numbers only).`);
  return s;
}

function isoDateTime(value, { field = 'datetime', optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw errors.httpError(400, `${field} is required.`);
  }
  const s = String(value).trim().replace(' ', 'T');
  const ms = Date.parse(s.endsWith('Z') || s.includes('+') || s.includes('T') ? s : `${s}T00:00:00`);
  if (Number.isNaN(ms)) throw errors.httpError(400, `${field} must be a valid date/time.`);
  return new Date(ms).toISOString();
}

function safeUrl(value, field = 'url') {
  if (!value || value === '') return '';
  const s = String(value).trim();
  let u;
  try { u = new URL(s); } catch { throw errors.httpError(400, `${field} must be a valid http(s) URL.`); }
  if (!['http:', 'https:'].includes(u.protocol)) throw errors.httpError(400, `${field} must be an http(s) URL.`);
  return u.href;
}

// Text that will be stored and rendered: trim, strip control chars, cap length.
function cleanText(value, { field = 'text', max = 2000, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw errors.httpError(400, `${field} is required.`);
  }
  const s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (s.length === 0) throw errors.httpError(400, `${field} cannot be empty.`);
  if (s.length > max) throw errors.httpError(400, `${field} is too long (max ${max} characters).`);
  return s;
}

module.exports = { str, int, oneOf, gameUserId, isoDateTime, safeUrl, cleanText };
