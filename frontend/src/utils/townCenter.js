// Converts a raw Town Center level (as pulled from MightPulse) into what the
// game actually displays. Confirmed against real in-game data:
//   - 1–30   → shown as the plain level number
//   - 31–34  → the game still shows "30" (these raw levels exist internally
//              but aren't surfaced as 31/32/33/34 in the UI)
//   - 35+    → Truegold tiers, each spanning 5 raw levels: 35–39 is TG1,
//              40–44 is TG2, 45–49 is TG3, and so on (TG5 = 55–59, matching
//              a confirmed real example)
//
// Returns null for no data, { kind: 'level', level } for a plain number, or
// { kind: 'tg', tier } for a Truegold tier.
export function getTownCenterInfo(rawLevel) {
  const n = Number(rawLevel);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 30) return { kind: 'level', level: n };
  if (n <= 34) return { kind: 'level', level: 30 };
  const tier = Math.floor((n - 35) / 5) + 1;
  return { kind: 'tg', tier };
}

// Plain-text form, e.g. for compact admin table cells: "30" or "TG5".
export function formatTownCenter(rawLevel) {
  const info = getTownCenterInfo(rawLevel);
  if (!info) return null;
  return info.kind === 'tg' ? `TG${info.tier}` : String(info.level);
}
