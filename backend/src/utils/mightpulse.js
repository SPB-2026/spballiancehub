// Client for the MightPulse public API (https://api.mightpulse.com) — used
// to sync alliance member stats (power, Town Center, alliance rank) from
// the game. MightPulse is an independent fan project, not an official
// Century Games API; see docs/README for the tradeoffs of relying on it.
const env = require('../config/env');
const { httpError } = require('../middleware/errors');

const BASE_URL = 'https://api.mightpulse.com/v1';

async function mpFetch(path) {
  const apiKey = env.MIGHTPULSE_API_KEY;
  if (!apiKey) {
    throw httpError(500, 'MightPulse sync is not configured. Set MIGHTPULSE_API_KEY on the server.', { expose: true });
  }
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (e) {
    throw httpError(502, `Could not reach MightPulse: ${e.message || 'network error'}.`, { expose: true });
  }
  if (res.status === 401) throw httpError(500, 'MightPulse rejected the API key — it may be invalid or revoked.', { expose: true });
  if (res.status === 404) throw httpError(404, 'MightPulse has no record of that alliance/kingdom. Check the Kingdom ID and Alliance tag in Settings.', { expose: true });
  if (res.status === 429) throw httpError(502, 'MightPulse rate limit reached — try again in a minute.', { expose: true });
  if (!res.ok) throw httpError(502, `MightPulse returned an unexpected error (HTTP ${res.status}).`, { expose: true });
  let json;
  try {
    json = await res.json();
  } catch {
    throw httpError(502, 'MightPulse returned an unexpected response.', { expose: true });
  }
  return json;
}

// Fetch every member of the given alliance. Returns a plain array of raw
// MightPulse member records (see api.mightpulse.com docs for field list).
async function fetchAllianceRoster(kingdomId, tag) {
  if (!kingdomId || !tag) {
    throw httpError(400, 'MightPulse Kingdom ID and Alliance tag must be set in Admin → Settings first.', { expose: true });
  }
  const data = await mpFetch(`/alliances/${encodeURIComponent(kingdomId)}/${encodeURIComponent(tag)}?include=info,roster`);
  return { info: data.alliance || null, members: data.members || [] };
}

// Kingshot displays Town Center progress past level 30 as Truegold tiers
// (TG1–TG8) rather than continuing the plain level number — see the
// Truegold building system. Below level 30, show the plain level.
// Confirmed against real in-game data: 1–30 shown as-is, 31–34 flatten to
// "30", and from 35 onward each Truegold tier spans 5 raw levels (35–39 =
// TG1, 40–44 = TG2, ... 55–59 = TG5, matching a confirmed real example).
function formatTownCenter(rawLevel) {
  const n = Number(rawLevel);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 30) return `Lv. ${n}`;
  if (n <= 34) return 'Lv. 30';
  const tier = Math.floor((n - 35) / 5) + 1;
  return `TG${tier}`;
}

// MightPulse's alliance_rank_label uses game words ("Leader", "Officer",
// etc.); this site's own Role field uses R5–R1 to match Kingshot's actual
// in-game rank tiers directly, so we map the numeric alliance_rank instead
// of trying to match label text (which can vary/localize).
function mapAllianceRankToRole(allianceRank) {
  const n = Number(allianceRank);
  if (n >= 5) return 'R5';
  if (n === 4) return 'R4';
  if (n === 3) return 'R3';
  if (n === 2) return 'R2';
  return 'R1';
}

module.exports = { fetchAllianceRoster, formatTownCenter, mapAllianceRankToRole };
