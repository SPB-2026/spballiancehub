// Centralized website settings (alliance identity, social links, announcement...).
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Settings = require('../models/settings');
const img = require('../utils/image');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

async function publicSettings() {
  const s = await Settings.all();
  return {
    alliance_name: s.alliance_name,
    tagline: s.tagline,
    alliance_rank: s.alliance_rank || '',
    announcement: s.announcement || '',
    discord_url: s.discord_url || '',
    youtube_url: s.youtube_url || '',
    timezone: s.timezone || 'UTC',
    logo: s.logo || '',
    description: s.description || '',
    contact_email: s.contact_email || '',
    footer_text: s.footer_text || '',
    maintenance: Number(s.maintenance) === 1,
    favicon: s.favicon || '',
    home_title: s.home_title || '',
    home_accent: s.home_accent || '',
    home_text: s.home_text || '',
    home_primary_label: s.home_primary_label || '',
    home_primary_link: s.home_primary_link || '',
    home_secondary_label: s.home_secondary_label || '',
    home_secondary_link: s.home_secondary_link || '',
    home_banner: s.home_banner || '',
  };
}

// Internal site links allowed for Home buttons (no external navigation targets).
function internalLink(value, field) {
  const s = v.str(value, { field, max: 120 });
  if (!s.startsWith('/') || s.startsWith('//')) throw httpError(400, `${field} must be an internal site link like /news.`);
  return s;
}

function uploadUrl(value, field) {
  if (value === '' || value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s.startsWith('/uploads/')) throw httpError(400, `${field} must come from the Media library.`);
  return s;
}

async function updateMany(input, adminName) {
  const fields = {};
  if (input.alliance_name !== undefined) fields.alliance_name = v.str(input.alliance_name, { field: 'Alliance name', max: 60 });
  if (input.tagline !== undefined) fields.tagline = v.cleanText(input.tagline, { field: 'Tagline', max: 120, optional: true });
  if (input.alliance_rank !== undefined) fields.alliance_rank = v.cleanText(input.alliance_rank, { field: 'Alliance rank', max: 60, optional: true });
  if (input.announcement !== undefined) fields.announcement = v.cleanText(input.announcement, { field: 'Announcement', max: 300, optional: true });
  if (input.discord_url !== undefined) fields.discord_url = v.safeUrl(input.discord_url, 'Discord URL') || '';
  if (input.youtube_url !== undefined) fields.youtube_url = v.safeUrl(input.youtube_url, 'YouTube URL') || '';
  if (input.timezone !== undefined) {
    const tz = v.str(input.timezone, { field: 'Timezone', max: 64 });
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
    } catch {
      throw httpError(400, 'Invalid IANA timezone (e.g. Asia/Kolkata, Europe/London).');
    }
    fields.timezone = tz;
  }
  // Site-wide content
  if (input.description !== undefined) fields.description = v.cleanText(input.description, { field: 'Website description', max: 300, optional: true });
  if (input.contact_email !== undefined) {
    const email = v.str(input.contact_email, { field: 'Contact email', max: 160, optional: true });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid contact email or leave it empty.');
    fields.contact_email = email;
  }
  if (input.footer_text !== undefined) fields.footer_text = v.cleanText(input.footer_text, { field: 'Footer text', max: 200, optional: true });
  if (input.maintenance !== undefined) fields.maintenance = input.maintenance ? '1' : '0';
  if (input.favicon !== undefined) fields.favicon = uploadUrl(input.favicon, 'Favicon');
  // Home page content
  if (input.home_title !== undefined) fields.home_title = v.str(input.home_title, { field: 'Home title', max: 60 });
  if (input.home_accent !== undefined) fields.home_accent = v.cleanText(input.home_accent, { field: 'Home accent', max: 60, optional: true });
  if (input.home_text !== undefined) fields.home_text = v.cleanText(input.home_text, { field: 'Home description', max: 500, optional: true });
  if (input.home_primary_label !== undefined) fields.home_primary_label = v.str(input.home_primary_label, { field: 'Primary button label', max: 40 });
  if (input.home_primary_link !== undefined) fields.home_primary_link = internalLink(input.home_primary_link, 'Primary button link');
  if (input.home_secondary_label !== undefined) fields.home_secondary_label = v.str(input.home_secondary_label, { field: 'Secondary button label', max: 40 });
  if (input.home_secondary_link !== undefined) fields.home_secondary_link = internalLink(input.home_secondary_link, 'Secondary button link');
  if (input.home_banner !== undefined) fields.home_banner = uploadUrl(input.home_banner, 'Home banner');
  await Settings.setMany(Object.entries(fields));
  return { ok: true, updated: Object.keys(fields), by: adminName };
}

async function uploadLogo(file) {
  img.assertAllowedImage(file);
  img.assertDimensions(file.buffer, { min: 64, max: 1024 });
  const dir = path.join(UPLOAD_DIR, 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  const filename = img.safeFilename('logo', img.extFor(file.mimetype));
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  await Settings.set('logo', `/uploads/avatars/${filename}`);
  return { ok: true, logo: `/uploads/avatars/${filename}` };
}

module.exports = { publicSettings, updateMany, uploadLogo };
