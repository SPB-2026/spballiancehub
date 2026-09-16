// Member directory, profiles, and avatar uploads.
// PRIVACY: /list and /:id return only public fields. game_user_id and email are
// exposed exclusively through admin.service (requireAdmin-protected routes).
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const img = require('../utils/image');
const { uploadToImgbb } = require('../utils/imgbb');
const Members = require('../models/members');

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
  const filename = img.safeFilename(`member-${memberId}`, img.extFor(file.mimetype));
  const hosted = await uploadToImgbb(file.buffer, { filename });
  // The previous avatar (if any) stays hosted on ImgBB — no reliable
  // server-side delete API (see utils/imgbb.js) — this just points the
  // member record at the new one.
  const updated = await Members.update(memberId, { avatar: hosted.url });
  return publicView(updated);
}

module.exports = { list, get, updateOwnProfile, uploadAvatar, publicView };
