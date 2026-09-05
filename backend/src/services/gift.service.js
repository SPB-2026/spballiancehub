// Gift code system. Redemption is transactional and tied to the member's ID.
// If an external redemption API is added later, its credentials stay in .env / server code only.
const { httpError } = require('../middleware/errors');
const v = require('../utils/validate');
const db = require('../config/db');
const env = require('../config/env');
const Gifts = require('../models/gifts');

async function redeem(memberId, codeInput) {
  const code = String(codeInput || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) throw httpError(400, 'Enter a valid gift code (letters, numbers, dashes).');

  const row = await Gifts.activeForRedemption(code);
  if (!row) throw httpError(404, 'This gift code does not exist.');
  if (!row.active) throw httpError(400, 'This gift code has been deactivated.');
  if (row.expired) throw httpError(400, 'This gift code has expired.');
  if (row.remaining <= 0) throw httpError(400, 'All uses of this gift code have been claimed.');
  if ((await Gifts.redemptionCountForMember(row.id, memberId)) >= row.per_member_limit) {
    throw httpError(400, `You have already redeemed this code (limit ${row.per_member_limit} per member).`);
  }

  // Transactional: both writes commit together (ambient transaction client).
  // Re-check limits inside the transaction to prevent races under concurrency.
  try {
    await require('../config/db').transaction(async () => {
      const freshCount = await Gifts.redemptionCountForMember(row.id, memberId);
      if (freshCount >= row.per_member_limit) throw httpError(400, `You have already redeemed this code (limit ${row.per_member_limit} per member).`);
      await Gifts.incrementUse(row.id);
      await Gifts.recordRedemption(row.id, memberId);
    })();
  } catch (err) {
    if (err && err.message === 'GIFT_MAX_USES_EXCEEDED') throw httpError(400, 'All uses of this gift code have been claimed.');
    throw err;
  }

  return {
    ok: true,
    message: `Redeemed “${code}”. Reward: ${row.reward || row.description || 'Alliance bonus'}. Check the command notice for delivery.`,
    reward: row.reward || row.description,
  };
}

// Public redemption — no member login required (site is public)
async function redeemPublic(codeInput) {
  const code = String(codeInput || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) throw httpError(400, 'Enter a valid gift code (letters, numbers, dashes).');
  const row = await Gifts.activeForRedemption(code);
  if (!row) throw httpError(404, 'This gift code does not exist.');
  if (!row.active) throw httpError(400, 'This gift code has been deactivated.');
  if (row.expired) throw httpError(400, 'This gift code has expired.');
  if (row.remaining <= 0) throw httpError(400, 'All uses of this gift code have been claimed.');
  try {
    await require('../config/db').transaction(async () => {
      await Gifts.incrementUse(row.id);
    })();
  } catch (err) {
    if (err && err.message === 'GIFT_MAX_USES_EXCEEDED') throw httpError(400, 'All uses of this gift code have been claimed.');
    throw err;
  }
  return {
    ok: true,
    message: `Redeemed “${code}”. Reward: ${row.reward || row.description || 'Alliance bonus'}.`,
    reward: row.reward || row.description,
  };
}

async function myRedemptions(memberId) {
  return Gifts.myRedemptions(memberId);
}

// Public list (no member data — code + reward details).
// `id` is intentionally included: the frontend uses it as the stable React
// key and per-card copy-state id. (It's a plain row id, not sensitive data.)
// Members only ever see PUBLISHED codes: status 'approved' (and 'expired'
// rows that are still enabled — shown with their existing Expired badge,
// matching the pre-fetcher behaviour). Pending / rejected / invalid codes,
// fetch logs, notes and source config are never exposed here.
async function listPublic() {
  return (await Gifts.listApproved()).map(({ id, code, description, reward, max_uses, per_member_limit, active, expires_at, created_at, remaining, expired }) => ({
    id, code, description, reward, max_uses, per_member_limit, active, expires_at, created_at, remaining, expired,
  }));
}

// Admin CRUD ---------------------------------------------------------------
async function listAll() {
  return Gifts.list();
}

async function create(input) {
  const code = String(input.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) throw httpError(400, 'Code must be 3–32 chars: letters, numbers, dashes.');
  const description = v.cleanText(input.description || '', { field: 'Description', max: 200, optional: true });
  const reward = v.cleanText(input.reward || '', { field: 'Reward', max: 200, optional: true });
  const max_uses = v.int(input.max_uses, { field: 'Max uses', min: 1, max: 100000 });
  const per_member_limit = v.int(input.per_member_limit, { field: 'Per-member limit', min: 1, max: 100000 });
  const active = Boolean(input.active !== false && input.active !== 0);
  const expires_at = input.expires_at ? v.isoDateTime(input.expires_at, { field: 'Expiry', optional: true }) : null;
  try {
    return await Gifts.create({ code, description, reward, max_uses, per_member_limit, active, expires_at });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'A gift code with this name already exists.');
    throw err;
  }
}

async function update(id, input) {
  const existing = await Gifts.findById(id);
  if (!existing) throw httpError(404, 'Gift code not found.');
  const fields = {};
  if (input.code !== undefined) {
    const code = String(input.code).trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) throw httpError(400, 'Code must be 3–32 chars: letters, numbers, dashes.');
    fields.code = code;
  }
  if (input.description !== undefined) fields.description = v.cleanText(input.description, { field: 'Description', max: 200, optional: true });
  if (input.reward !== undefined) fields.reward = v.cleanText(input.reward, { field: 'Reward', max: 200, optional: true });
  if (input.max_uses !== undefined) fields.max_uses = v.int(input.max_uses, { field: 'Max uses', min: 1, max: 100000 });
  if (input.per_member_limit !== undefined) fields.per_member_limit = v.int(input.per_member_limit, { field: 'Per-member limit', min: 1, max: 100000 });
  if (input.active !== undefined) fields.active = input.active ? 1 : 0;
  if (input.expires_at !== undefined) fields.expires_at = input.expires_at ? v.isoDateTime(input.expires_at, { field: 'Expiry', optional: true }) : null;
  try {
    return await Gifts.update(id, fields);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw httpError(409, 'A gift code with this name already exists.');
    throw err;
  }
}

async function remove(id) {
  if (!(await Gifts.remove(id))) throw httpError(404, 'Gift code not found.');
  return { ok: true };
}

async function redemptions(id) {
  if (!(await Gifts.findById(id))) throw httpError(404, 'Gift code not found.');
  return Gifts.redemptionsFor(id);
}

// Code discovery (Kingshot fetcher) ----------------------------------------
const fetcher = require('./giftCodeFetcher');

// Kick off an async fetch. Returns 202 immediately; progress is read via
// fetchStatus(). The fetch runs in the background (a full pass over all
// sources can take a minute or more). Re-entrancy is guarded inside the
// fetcher (one run at a time). Admin-only (mounted under /admin in
// admin.routes).
async function fetchNow() {
  if (fetcher.isRunning()) throw httpError(409, 'A fetch is already running.');
  // Fire-and-forget: runFetch manages its own log row and error handling,
  // so a crash here cannot leave a stuck 'running' row.
  fetcher.runFetch('manual').catch(() => {});
  return { started: true, message: 'Fetch started in the background — poll the status card for results.' };
}

async function fetchStatus() {
  const s = await fetcher.getStatus();
  const schedule = require('../jobs/giftCodeFetch').getSchedule();
  return {
    ...s,
    interval_sec: schedule.interval_sec,
    next_run_at: schedule.next_run_at,
  };
}

async function fetchLogs(limit) {
  const n = v.int(limit, { field: 'limit', min: 1, max: 25, optional: true });
  return fetcher.getLogs(n || 8);
}

// Approve & publish a pending code (uses the existing publish mechanism:
// status → approved, active → 1). Also acts as an admin OVERRIDE for codes
// the fetcher auto-marked 'expired' from source evidence — a deliberate,
// audited decision (verification_status becomes 'verified').
async function approve(id) {
  const row = await Gifts.findById(id);
  if (!row) throw httpError(404, 'Gift code not found.');
  if (!['pending', 'expired'].includes(row.status)) throw httpError(400, 'Only pending or auto-expired codes can be approved.');
  const note = row.status === 'expired' ? 'Approved by admin (overriding source expiry evidence). ' : '';
  await db
    .prepare(`UPDATE gift_codes SET status = 'approved', active = 1, verification_status = 'verified', notes = ? || COALESCE(notes, ''), updated_at = now() WHERE id = ?`)
    .run(note, id);
  return { ok: true, gift: await Gifts.findById(id) };
}

// Reject a pending code (kept for the record, hidden from members).
async function reject(id) {
  const row = await Gifts.findById(id);
  if (!row) throw httpError(404, 'Gift code not found.');
  if (row.status !== 'pending') throw httpError(400, 'Only pending codes can be rejected.');
  await db.prepare(`UPDATE gift_codes SET status = 'rejected', active = 0, updated_at = now() WHERE id = ?`).run(id);
  return { ok: true, gift: await Gifts.findById(id) };
}

// Manually mark any code expired (e.g. a source no longer lists it as active).
async function markExpired(id) {
  const row = await Gifts.findById(id);
  if (!row) throw httpError(404, 'Gift code not found.');
  await db
    .prepare(`UPDATE gift_codes SET status = 'expired', active = 0, notes = 'Marked expired by admin. ' || COALESCE(notes, ''), updated_at = now() WHERE id = ?`)
    .run(id);
  return { ok: true, gift: await Gifts.findById(id) };
}

async function getSources() {
  return fetcher.getSources();
}

async function saveSources(input) {
  try {
    return await fetcher.saveSources(input.sources);
  } catch (err) {
    throw httpError(400, err.message);
  }
}

module.exports = {
  redeem,
  redeemPublic,
  myRedemptions,
  listPublic,
  listAll,
  create,
  update,
  remove,
  redemptions,
  fetchNow,
  fetchStatus,
  fetchLogs,
  approve,
  reject,
  markExpired,
  getSources,
  saveSources,
};
