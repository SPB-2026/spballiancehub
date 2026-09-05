// Admin-only operations: dashboard stats, full member management (including private
// fields). All routes using this service sit behind requireAdmin.
const bcrypt = require('bcryptjs');
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const Members = require('../models/members');
const Admins = require('../models/admins');
const Events = require('../models/events');
const News = require('../models/news');
const Articles = require('../models/articles');
const Gifts = require('../models/gifts');
const Settings = require('../models/settings');
const Activity = require('../models/activity');
const Announcements = require('../models/announcements');

async function dashboard() {
  const events = await Events.list();
  const announcements = await Announcements.list();
  const gifts = await Gifts.list();
  return {
    members_total: await Members.count(),
    members_active: await Members.countByStatus('active'),
    announcements_total: announcements.length,
    announcements_active: announcements.filter((a) => a.published && (!a.expires_at || new Date(a.expires_at) > new Date())).length,
    events_total: events.length,
    events_upcoming: events.filter((e) => e.status === 'upcoming').length,
    events_ongoing: events.filter((e) => e.status === 'ongoing').length,
    events_completed: events.filter((e) => e.status === 'completed').length,
    news_published: await News.countPublished(),
    tips_published: (await Articles.publishedList()).length,
    gift_codes: gifts.length,
    active_gifs: gifts.filter((g) => g.active && !g.expired && g.remaining > 0).length,
    admins: await Admins.count(),
    activity_total: await Activity.count(),
    settings: await Settings.all(),
  };
}

// ── Admin accounts ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASS_LEN = 8;

async function listAdmins() {
  return Admins.list();
}

async function createAdmin(input) {
  const username = v.str(input.username, { field: 'Username', max: 40 });
  const email = v.str(input.email, { field: 'Email', max: 160 }).toLowerCase();
  const name = v.str(input.name, { field: 'Name', max: 40 });
  const password = v.str(input.password, { field: 'Password', max: 128 });
  if (!EMAIL_RE.test(email)) throw httpError(400, 'Please enter a valid email address.');
  if (password.length < MIN_PASS_LEN) throw httpError(400, `Password must be at least ${MIN_PASS_LEN} characters.`);
  try {
    return await Admins.create({ username, email, name, password_hash: bcrypt.hashSync(password, 10) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'An admin with that username or email already exists.');
    throw err;
  }
}

async function updateAdmin(id, input) {
  const existing = await Admins.findById(id);
  if (!existing) throw httpError(404, 'Admin not found.');
  const fields = {};
  if (input.name !== undefined) fields.name = v.str(input.name, { field: 'Name', max: 40 });
  if (input.username !== undefined) fields.username = v.str(input.username, { field: 'Username', max: 40 });
  if (input.email !== undefined) {
    const email = v.str(input.email, { field: 'Email', max: 160 }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw httpError(400, 'Please enter a valid email address.');
    fields.email = email;
  }
  if (input.password !== undefined) {
    const p = v.str(input.password, { field: 'New password', max: 128 });
    if (p.length < MIN_PASS_LEN) throw httpError(400, `Password must be at least ${MIN_PASS_LEN} characters.`);
    fields.password_hash = bcrypt.hashSync(p, 10);
  }
  try {
    return await Admins.update(id, fields);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'That username or email is already in use.');
    throw err;
  }
}

async function removeAdmin(id, selfId) {
  if (id === selfId) throw httpError(400, 'You cannot remove your own admin account.');
  if ((await Admins.count()) <= 1) throw httpError(400, 'At least one admin account must remain.');
  if (!(await Admins.remove(id))) throw httpError(404, 'Admin not found.');
  return { ok: true };
}

// ── Activity log ───────────────────────────────────────────────────────────
async function activity(limit) {
  return Activity.recent(limit);
}

async function clearActivity() {
  return { ok: true, removed: await Activity.clear() };
}

// ── Member management (PRIVATE data lives here) ────────────────────────────
async function listMembers() {
  return Members.listAll();
}

// Only one member may hold R5 at any time (the alliance leader).
async function assertR5Available(targetId) {
  const holders = (await Members.findRole('R5')).filter((h) => h.id !== targetId);
  if (holders.length > 0) {
    throw httpError(409, `R5 is already held by ${holders[0].name}. Only one member can be R5 — demote them first.`);
  }
}

async function createMember(input) {
  const game_user_id = v.gameUserId(input.game_user_id); // exactly 9 digits
  const email = v.str(input.email, { field: 'Email', max: 160 }).toLowerCase();
  const name = v.str(input.name, { field: 'Display name', max: 40 });
  const role = v.oneOf(input.role || 'R1', ['R5', 'R4', 'R3', 'R2', 'R1'], 'Role');
  if (role === 'R5') await assertR5Available(null);
  const status = v.oneOf(input.status || 'active', ['active', 'inactive', 'banned'], 'Status');
  const bio = v.cleanText(input.bio || '', { field: 'Bio', max: 300, optional: true });
  const contributions = v.int(input.contributions, { field: 'Contributions', min: 0, max: 100000000, optional: true });
  const score = v.int(input.score, { field: 'Power', min: 0, max: 100000000000, optional: true });
  const join_date = input.join_date ? v.isoDateTime(input.join_date, { field: 'Join date', optional: true }).slice(0, 10) : new Date().toISOString().slice(0, 10);
  try {
    return await Members.create({ game_user_id, email, name, role, status, bio, contributions, score, join_date });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'A member with that Game User ID or email already exists.');
    throw err;
  }
}

async function updateMember(id, input) {
  const existing = await Members.findById(id);
  if (!existing) throw httpError(404, 'Member not found.');
  const fields = {};
  if (input.name !== undefined) fields.name = v.str(input.name, { field: 'Display name', max: 40 });
  if (input.email !== undefined) fields.email = v.str(input.email, { field: 'Email', max: 160 }).toLowerCase();
  if (input.avatar !== undefined) {
    if (input.avatar === null || input.avatar === '') {
      fields.avatar = null;
    } else {
      const a = v.str(input.avatar, { field: 'Avatar', max: 500 });
      if (!a.startsWith('/uploads/')) throw httpError(400, 'Avatar must be an uploaded image.');
      fields.avatar = a;
    }
  }
  if (input.game_user_id !== undefined) fields.game_user_id = v.gameUserId(input.game_user_id);
  if (input.role !== undefined) {
    fields.role = v.oneOf(input.role, ['R5', 'R4', 'R3', 'R2', 'R1'], 'Role');
    if (fields.role === 'R5') await assertR5Available(id);
  }
  if (input.status !== undefined) fields.status = v.oneOf(input.status, ['active', 'inactive', 'banned'], 'Status');
  if (input.bio !== undefined) fields.bio = v.cleanText(input.bio, { field: 'Bio', max: 300, optional: true });
  if (input.contributions !== undefined) fields.contributions = v.int(input.contributions, { field: 'Contributions', min: 0, max: 100000000 });
  if (input.score !== undefined) fields.score = v.int(input.score, { field: 'Power', min: 0, max: 100000000000 });
  if (input.join_date !== undefined) fields.join_date = v.isoDateTime(input.join_date, { field: 'Join date', optional: true }).slice(0, 10);
  try {
    return await Members.update(id, fields);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'That Game User ID or email is already in use.');
    throw err;
  }
}

async function removeMember(id) {
  if (!(await Members.remove(id))) throw httpError(404, 'Member not found.');
  return { ok: true };
}

// Resets a member's public statistics to zero (profile picture / name are left intact).
async function resetMemberStats(id) {
  const row = await Members.update(id, { contributions: 0, score: 0 });
  if (!row) throw httpError(404, 'Member not found.');
  return row;
}

module.exports = {
  dashboard,
  listMembers, createMember, updateMember, removeMember, resetMemberStats,
  listAdmins, createAdmin, updateAdmin, removeAdmin,
  activity, clearActivity,
};
