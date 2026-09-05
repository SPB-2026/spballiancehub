// Member directory, profiles, and avatar uploads.
// PRIVACY: /list and /:id return only public fields. game_user_id and email are
// exposed exclusively through admin.service (requireAdmin-protected routes).
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const img = require('../utils/image');
const Members = require('../models/members');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

function publicView(row) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    bio: row.bio,
    contributions: row.contributions,
    score: row.score,
    join_date: row.join_date,
    last_active: row.last_active,
  };
}

async function list() {
  return (await Members.listPublic()).map(publicView);
}

async function get(id) {
  const row = await Members.publicById(id);
  if (!row) throw httpError(404, 'Member not found.');
  const view = publicView(row);
  view.activity = { lastSeen: row.last_active };
  return view;
}

async function updateOwnProfile(memberId, { name, bio }) {
  const fields = {};
  if (name !== undefined) fields.name = v.str(name, { field: 'Display name', max: 40 });
  if (bio !== undefined) fields.bio = v.cleanText(bio, { field: 'Bio', max: 300, optional: true });
  const updated = await Members.update(memberId, fields);
  if (!updated) throw httpError(404, 'Member not found.');
  return publicView(updated);
}

async function uploadAvatar(memberId, file) {
  img.assertAllowedImage(file);
  img.assertDimensions(file.buffer, { min: 64, max: 1024 });
  const dir = path.join(UPLOAD_DIR, 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  const filename = img.safeFilename(`member-${memberId}`, img.extFor(file.mimetype));
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  // Replace any previous avatar file (best effort).
  const current = await Members.findById(memberId);
  if (current && current.avatar && current.avatar.startsWith('/uploads/avatars/')) {
    const old = path.join(UPLOAD_DIR, 'avatars', path.basename(current.avatar));
    if (old !== path.join(dir, filename)) fs.promises.unlink(old).catch(() => {});
  }
  const updated = await Members.update(memberId, { avatar: `/uploads/avatars/${filename}` });
  return publicView(updated);
}

module.exports = { list, get, updateOwnProfile, uploadAvatar, publicView };
