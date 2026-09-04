// Date/time/countdown formatting helpers.

export function fmtDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...opts });
}

export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function initials(name = '?') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// "3d 4h" style countdown parts
export function countdownParts(targetIso) {
  const target = new Date(targetIso).getTime();
  let diff = target - Date.now();
  const past = diff < 0;
  diff = Math.abs(diff);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { past, d, h, m, s };
}

export function countdownText(targetIso) {
  const { past, d, h, m, s } = countdownParts(targetIso);
  if (past) return 'Ended';
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function num(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString();
}

// Coerce any tags value into a clean array of trimmed, non-empty strings.
// Handles: arrays, CSV strings ("A, B"), JSON-array strings ('["A","B"]'),
// null/undefined/empty, numbers, objects — so pages never crash on
// malformed legacy data.
export function asTagArray(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t === null || t === undefined ? '' : t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    const s = tags.trim();
    if (s === '') return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return asTagArray(parsed);
      } catch { /* not JSON — treat as CSV */ }
    }
    return s.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

// "Combat, Heroes, Strategy" <-> ["Combat", "Heroes", "Strategy"]
export function tagsToCsv(tags) {
  return asTagArray(tags).join(', ');
}
