// Member-facing access gate: a magic link + Game User ID unlock the public
// site for real, currently-active alliance members, with no password to
// remember. See middleware/auth.js for the re-check-on-every-request logic
// that makes removal from the roster take effect immediately.
const crypto = require('crypto');
const env = require('../config/env');
const db = require('../config/db');
const { httpError } = require('../middleware/errors');
const { signToken } = require('../middleware/auth');
const Settings = require('../models/settings');

const LINK_TOKEN_KEY = 'access_link_token';
const VISIT_GROUPING_MINUTES = 30;
const MEMBER_TOKEN_HOURS = 24 * 365; // ~1 year — members shouldn't be re-asked often

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function getOrCreateLinkToken() {
  let token = await Settings.get(LINK_TOKEN_KEY, '');
  if (!token) {
    token = generateToken();
    await Settings.set(LINK_TOKEN_KEY, token);
  }
  return token;
}

async function rotateLinkToken() {
  const token = generateToken();
  await Settings.set(LINK_TOKEN_KEY, token);
  return token;
}

function buildLinkUrl(token) {
  const base = String(env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return `${base || ''}/enter/${token}`;
}

async function getLinkInfo() {
  const token = await getOrCreateLinkToken();
  return { token, url: buildLinkUrl(token) };
}

async function rotateLink() {
  const token = await rotateLinkToken();
  return { token, url: buildLinkUrl(token) };
}

// Groups visits so loading five pages in one sitting is one log entry, not
// five — a new entry only starts after a real gap since the last one.
async function logVisitIfNew(gameUserId, name) {
  const last = await db
    .prepare('SELECT visited_at FROM access_log WHERE game_user_id = ? ORDER BY visited_at DESC LIMIT 1')
    .get(gameUserId);
  const graceMs = VISIT_GROUPING_MINUTES * 60 * 1000;
  const isNewVisit = !last || (Date.now() - new Date(last.visited_at).getTime()) > graceMs;
  if (isNewVisit) {
    await db.prepare('INSERT INTO access_log (game_user_id, name) VALUES (?, ?)').run(gameUserId, name);
  }
}

async function verifyMember({ game_user_id, token }) {
  const currentToken = await getOrCreateLinkToken();
  if (!token || token !== currentToken) {
    throw httpError(403, 'This link is no longer valid. Ask your alliance for the current one.');
  }

  const id = String(game_user_id || '').trim();
  if (!/^\d{9}$/.test(id)) {
    throw httpError(400, 'Enter your 9-digit Game User ID.');
  }

  const member = await db
    .prepare("SELECT id, game_user_id, name FROM members WHERE game_user_id = ? AND status = 'active'")
    .get(id);
  if (!member) {
    throw httpError(403, 'This Game ID is not recognized as an active alliance member.');
  }

  const jwtToken = signToken({ type: 'member', game_user_id: member.game_user_id }, MEMBER_TOKEN_HOURS);
  await logVisitIfNew(member.game_user_id, member.name);
  return { token: jwtToken, name: member.name };
}

// Called on every app load by an already-verified visitor. req.member is
// populated by attachUser, which re-checks the live roster on every request.
async function checkStatus(req) {
  if (!req.member) return { verified: false };
  await logVisitIfNew(req.member.game_user_id, req.member.name);
  return { verified: true, name: req.member.name };
}

async function listAccessLog({ search = '', limit = 100, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const off = Math.max(Number(offset) || 0, 0);
  const term = `%${String(search).trim()}%`;

  const rows = search
    ? await db
        .prepare('SELECT id, game_user_id, name, visited_at FROM access_log WHERE name ILIKE ? ORDER BY visited_at DESC LIMIT ? OFFSET ?')
        .all(term, lim, off)
    : await db
        .prepare('SELECT id, game_user_id, name, visited_at FROM access_log ORDER BY visited_at DESC LIMIT ? OFFSET ?')
        .all(lim, off);

  const countRow = search
    ? await db.prepare('SELECT COUNT(*)::int AS n FROM access_log WHERE name ILIKE ?').get(term)
    : await db.prepare('SELECT COUNT(*)::int AS n FROM access_log').get();

  return { rows, total: countRow?.n || 0 };
}

module.exports = { getLinkInfo, rotateLink, verifyMember, checkStatus, listAccessLog };
