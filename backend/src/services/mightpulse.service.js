// Syncs the member roster against the MightPulse API.
//
// What syncs automatically (no admin action needed): for members already on
// the site, their Power, Town Center, and Role are refreshed from the game
// every time this runs. Membership itself is never changed automatically —
// a roster member with no matching site record is queued in
// mp_pending_members for the admin to approve or dismiss, and a site member
// no longer seen in the roster is flagged (mp_missing) rather than deleted,
// so a bad API response or a brief absence can't silently wipe someone out.
const Members = require('../models/members');
const Pending = require('../models/mpPending');
const Settings = require('../models/settings');
const env = require('../config/env');
const { fetchAllianceRoster, mapAllianceRankToRole } = require('../utils/mightpulse');

async function getConfig() {
  const kingdomId = (await Settings.get('mp_kingdom_id', '')) || env.MP_KINGDOM_ID;
  const tag = (await Settings.get('mp_alliance_tag', '')) || env.MP_ALLIANCE_TAG;
  return { kingdomId, tag };
}

async function runSync() {
  const { kingdomId, tag } = await getConfig();
  const { members: roster } = await fetchAllianceRoster(kingdomId, tag);

  // TEMPORARY DEBUG — remove once the Town Center field mapping is confirmed
  // against real data. Logs one raw roster record so we can see MightPulse's
  // actual field names/values directly rather than guessing from docs/search.
  if (roster.length > 0) {
    console.log('[mightpulse-debug] sample roster record:', JSON.stringify(roster[0], null, 2));
  }

  const existing = await Members.listAll();
  const byGameId = new Map(existing.filter((m) => m.game_user_id).map((m) => [String(m.game_user_id), m]));
  const seenGameIds = new Set();

  let updated = 0;
  let queued = 0;

  for (const rm of roster) {
    const governorId = String(rm.governor_id ?? rm.fid ?? '');
    if (!governorId) continue;
    seenGameIds.add(governorId);

    const match = byGameId.get(governorId);
    if (match) {
      await Members.update(match.id, {
        role: mapAllianceRankToRole(rm.alliance_rank),
        score: Math.round(Number(rm.power) || 0),
        town_center: Number(rm.town_center_level) || null,
        mp_missing: false,
        mp_last_synced_at: new Date().toISOString(),
      });
      updated += 1;
    } else {
      await Pending.upsert({
        governor_id: governorId,
        nick_name: rm.nick_name || `Governor ${governorId}`,
        power: Math.round(Number(rm.power) || 0),
        town_center: Number(rm.town_center_level) || null,
        kills: Math.round(Number(rm.kills) || 0),
        alliance_rank: mapAllianceRankToRole(rm.alliance_rank),
        avatar_url: rm.avatar_url || '',
      });
      queued += 1;
    }
  }

  // Anyone on the site with a game ID that the current roster fetch didn't
  // include gets flagged, never removed.
  let flagged = 0;
  for (const m of existing) {
    if (!m.game_user_id) continue;
    const stillPresent = seenGameIds.has(String(m.game_user_id));
    if (!stillPresent && !m.mp_missing) {
      await Members.update(m.id, { mp_missing: true });
      flagged += 1;
    }
  }

  return { rosterSize: roster.length, updated, queued, flagged };
}

async function listPending() {
  return Pending.listAll();
}

async function listMissing() {
  const all = await Members.listAll();
  return all.filter((m) => m.mp_missing);
}

async function approvePending(id) {
  const p = await Pending.findById(id);
  if (!p) return null;
  const created = await Members.create({
    game_user_id: p.governor_id,
    email: null,
    name: p.nick_name,
    role: p.alliance_rank || 'R1',
    status: 'active',
    bio: '',
    contributions: 0,
    score: p.power || 0,
    town_center: p.town_center || null,
    join_date: new Date().toISOString().slice(0, 10),
  });
  await Pending.remove(id);
  return created;
}

async function approveAllPending() {
  const all = await Pending.listAll();
  const created = [];
  const failed = [];
  for (const p of all) {
    try {
      // eslint-disable-next-line no-await-in-loop
      created.push(await approvePending(p.id));
    } catch (err) {
      failed.push({ id: p.id, nick_name: p.nick_name, error: err.message });
    }
  }
  return { created, failed };
}

async function dismissPending(id) {
  await Pending.remove(id);
  return { ok: true };
}

// "False alarm" — clears the missing flag without touching membership.
// To actually remove someone confirmed to have left, use the existing
// DELETE /admin/members/:id route.
async function dismissMissing(id) {
  await Members.update(id, { mp_missing: false });
  return { ok: true };
}

module.exports = {
  runSync,
  getConfig,
  listPending,
  listMissing,
  approvePending,
  approveAllPending,
  dismissPending,
  dismissMissing,
};
