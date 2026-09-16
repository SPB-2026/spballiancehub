// Sanitizes admin-authored rich text (news/tips body, event/announcement
// text, home hero text, footer/announcement banner) before it's stored.
// This is the authoritative cleanup step — the frontend sanitizes again on
// render, but nothing reaches the database without passing through here.
const sanitizeHtml = require('sanitize-html');
const { httpError } = require('../middleware/errors');

const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'img'];

const OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['style'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedStyles: {
    span: {
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
    },
  },
  allowedSchemes: ['http', 'https'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
  // Legacy plain text with no markup at all should pass through untouched
  // (the frontend paragraph-splits it) rather than get tag-escaped twice.
  disallowedTagsMode: 'discard',
};

// Text that will be stored and rendered as rich HTML: sanitize to a strict
// allowlist, trim, cap length (measured on the visible text, not the markup,
// so a couple of formatting tags don't eat into the limit unfairly).
function cleanRichText(value, { field = 'content', max = 20000, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return '';
    throw httpError(400, `${field} is required.`);
  }
  const clean = sanitizeHtml(String(value), OPTIONS).trim();
  const visibleLength = clean.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().length;
  if (!optional && visibleLength === 0) throw httpError(400, `${field} cannot be empty.`);
  if (visibleLength > max) throw httpError(400, `${field} is too long (max ${max} characters).`);
  return clean;
}

module.exports = { cleanRichText };
