// Automatic Kingshot gift-code fetcher.
//
// Pulls public gift-code pages from a configured list of real, verified
// sources, extracts candidate codes, and files NEW ones as `pending` in the
// gift_codes table for admin review. Fetched web content is treated as
// UNTRUSTED input: HTML tags are stripped before any token is considered,
// nothing fetched is ever executed or rendered as HTML by the backend, and
// all DB writes go through parameterized queries.
//
// Security boundaries:
//   - https-only fetches; private/internal hosts are refused (SSRF guard).
//   - 12s per-source timeout, 3 MB size cap, at most 2 redirects.
//   - A failing source is logged and skipped — it never stops the others.
//   - Never bypasses CAPTCHAs/anti-bot: blocked sources (403) simply count
//     as failed and stay disabled until an admin re-enables them.
//   - New codes are NEVER member-visible: they land in status 'pending'.
//   - Expiry dates are stored ONLY when a source explicitly states one in
//     the same row/block as the code; otherwise NULL (unknown). Never
//     invented.
const https = require('https');
const db = require('../config/db');
const Settings = require('../models/settings');
const Gifts = require('../models/gifts');
const DEFAULT_SOURCES = require('../data/giftCodeSources');
const WORD_BLOCKLIST = require('../data/wordBlocklist');

const FETCH_TIMEOUT_MS = 12000;
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB per page (largest verified source ≈ 2.5 MB)
const MAX_REDIRECTS = 2;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const SOURCES_KEY = 'gift_code_sources';
const MAX_SOURCES = 20;

// Site vocabulary that can never be a code (nav buttons, column headers,
// status words, month names, years). The English-word blocklist (separate
// data file) handles the rest of ordinary prose.
// NOTE: split() applies to the WHOLE concatenated string — it must sit on the
// parenthesised expression, or it binds only to the last literal (precedence
// trap: 'a' + 'b'.split() is 'a' + ['b'], not ('a b').split()).
const STOP_WORDS = new Set(
  (
    'kingshot king shot gift code codes copy copied redeem redemption reward rewards tba new ' +
      'active expired working valid invalid latest newest current recent unknown n a na yes no ' +
      'free premium claim claimed claiming check checked checking update updated updates date ' +
      'day week month january february march april may june july august september october ' +
      'november december 2024 2025 2026 2027 2028'
  ).split(' ')
);

// ---------------------------------------------------------------------------
// Source configuration (admin-editable; persisted in settings as JSON)
// ---------------------------------------------------------------------------

function normalizeSources(input) {
  if (!Array.isArray(input)) throw new Error('sources must be an array');
  if (input.length > MAX_SOURCES) throw new Error(`at most ${MAX_SOURCES} sources`);
  const out = [];
  const seenNames = new Set();
  for (const s of input) {
    if (!s || typeof s !== 'object') throw new Error('each source must be an object');
    const name = String(s.name || '').trim().slice(0, 60);
    if (!name || name.length < 2) throw new Error('each source needs a name (2–60 chars)');
    if (seenNames.has(name.toLowerCase())) throw new Error(`duplicate source name: ${name}`);
    seenNames.add(name.toLowerCase());
    let url;
    try {
      url = new URL(String(s.url || ''));
    } catch {
      throw new Error(`${name}: invalid URL`);
    }
    if (url.protocol !== 'https:') throw new Error(`${name}: only https URLs are allowed`);
    if (url.hostname.length > 253) throw new Error(`${name}: invalid host`);
    out.push({
      name,
      url: url.toString(),
      enabled: s.enabled !== false && s.enabled !== 0 && s.enabled !== 'false',
      note: s.note ? String(s.note).slice(0, 200) : '',
    });
  }
  return out;
}

async function getSources() {
  try {
    const raw = await Settings.get(SOURCES_KEY, null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return normalizeSources(parsed);
    }
  } catch {
    /* corrupt config → fall back to defaults (logged at caller level) */
  }
  return DEFAULT_SOURCES.map((s) => ({ ...s }));
}

async function saveSources(input) {
  const normalized = normalizeSources(input);
  await Settings.set(SOURCES_KEY, JSON.stringify(normalized));
  return normalized;
}

// ---------------------------------------------------------------------------
// Safe fetch (https-only, SSRF-guarded, size-capped, redirect-limited)
// ---------------------------------------------------------------------------

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true;
  // IPv6 unique-local fc00::/7
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) return true;
  return false;
}

function fetchPage(url, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      return reject(new Error('invalid URL'));
    }
    if (u.protocol !== 'https:') return reject(new Error('only https URLs are allowed'));
    if (!u.hostname || isPrivateHost(u.hostname)) return reject(new Error('private/internal host is not allowed'));

    let settled = false;
    const fail = (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const req = https.get(
      u,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: FETCH_TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          let next;
          try {
            next = new URL(res.headers.location, u).toString();
          } catch {
            return fail(new Error('bad redirect'));
          }
          return fetchPage(next, redirectsLeft - 1).then(resolve, fail);
        }
        if (status === 429) return fail(new Error('rate limited (HTTP 429) — source skipped, not bypassed'));
        if (status === 403) return fail(new Error('blocked by source (HTTP 403) — source skipped, not bypassed'));
        if (status !== 200) {
          res.resume();
          return fail(new Error(`HTTP ${status}`));
        }
        const chunks = [];
        let size = 0;
        res.on('data', (c) => {
          size += c.length;
          if (size > MAX_BYTES) {
            req.destroy();
            return fail(new Error(`page too large (> ${MAX_BYTES / 1024 / 1024} MB)`));
          }
          chunks.push(c);
        });
        res.on('end', () => {
          if (settled) return;
          settled = true;
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        res.on('error', fail);
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout after ${FETCH_TIMEOUT_MS / 1000}s`)));
    req.on('error', fail);
  });
}

// ---------------------------------------------------------------------------
// Extraction (untrusted content: strip all tags, classify, filter)
// ---------------------------------------------------------------------------

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n);
      return c >= 32 && c <= 126 ? String.fromCharCode(c) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(inner) {
  return decodeEntities(inner.replace(/<[^>]+>/g, ' '));
}

// A token qualifies as a *candidate* when it looks like a gift code and not
// like an ordinary word:
//   - 3–32 chars of [A-Za-z0-9-], starting alnum (same shape as the redeem
//     validator, so anything we accept is redeemable in principle);
//   - not site vocabulary (STOP_WORDS);
//   - not a bare number (years, gem counts);
//   - not a count suffix ("21K", "3D" — follower counts, tiers);
//   - letters-only: 6+ chars AND not a common English word (blocklist) —
//     this rejects "CIVILIZATION"/"TUTORIAL" while keeping promo compounds
//     like "TRICKORTREAT"/"BONAPPETIT";
//   - hyphenated: rejected when no part mixes letters+digits and every
//     alphabetic part is a common word or a 1–2-letter word (rejects
//     "CASE-SENSITIVE", "In-Game", "top-up", "LATE-AUGUST").
function acceptToken(t) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,31}$/.test(t)) return false;
  if (STOP_WORDS.has(t.toLowerCase())) return false;
  if (/^\d+$/.test(t)) return false; // bare numbers (years, gem counts)
  if (/^\d{1,3}[A-Za-z]{1,2}$/.test(t)) return false; // count suffixes: 21K, 3D
  if (!/[0-9]/.test(t)) {
    if (t.length < 6) return false;
    if (WORD_BLOCKLIST.has(t.toUpperCase())) return false;
  }
  if (t.includes('-')) {
    const parts = t.split('-').filter(Boolean);
    const hasMixedPart = parts.some((p) => /[0-9]/.test(p) && /[A-Za-z]/.test(p));
    if (!hasMixedPart) {
      const alphaParts = parts.filter((p) => /[A-Za-z]/.test(p));
      if (
        alphaParts.length &&
        alphaParts.every((p) => p.length <= 2 || WORD_BLOCKLIST.has(p.toUpperCase()))
      )
        return false;
    }
  }
  return true;
}

// Strong code affordance: real code blocks say "Copy the code" / "Redeem".
// A bare "Copy" (as in share bars: "Copy link Facebook X Pinterest") is NOT
// an affordance.
const STRONG_AFFORDANCE = /\b(?:redeem\w*|copy\s+(?:this\s+)?(?:gift\s+)?codes?)\b/i;
// Words that mark a table row as belonging to a codes table.
const TABLE_CONTEXT = /\b(?:gift\s+codes?|codes?\s*\(?active|availab\w*|redeem\w*|expir\w*)\b/i;
// Kingshot-specific code families — extra confidence for letters-only tokens
// that appear outside a "kingshot" text context.
const KINGSHOT_PREFIX = /^(?:VIP|KINGSHOT|KINGSTORE|OFFICIALSTORE)/i;

// "September 2, 2026" / "September 2 2026" / "2026-09-02" → ISO end-of-day.
// Only called on text where the date sits next to the code (same row/block),
// so a page's global "last updated" stamp cannot be attributed to a code.

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// "September 2, 2026" / "September 2 2026" / "2026-09-02" → ISO end-of-day.
// Only called on text where the date sits next to the code (same row/block),
// so a page's global "last updated" stamp cannot be attributed to a code.
function parseExpiryDate(s) {
  let m = /([A-Za-z]+) (\d{1,2}),? (\d{4})/.exec(s);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month) {
      const day = Number(m[2]);
      const year = Number(m[3]);
      if (day >= 1 && day <= 31 && year >= 2024 && year <= 2035) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.000Z`;
      }
    }
  }
  m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    if (y >= 2024 && y <= 2035) return `${m[1]}-${m[2]}-${m[3]}T23:59:59.000Z`;
  }
  return null;
}

const EXPIRY_PREFIX = /(?:expires?|valid until|until)\s*:?\s*/i;
const DATE_RE = /(?:[A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/;
const PREFIXED_DATE_RE = /(?:expires?|valid until|until)\s*:?\s*(?:[A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i;

// True when the block contains a date that is NOT introduced by an
// expires/valid/until prefix (a publication date, "last checked" stamp,
// "date added" column, …). Letters-only candidates from such blocks are
// rejected: real codes with unknown expiry have no stray dates next to
// them, while article cards and nav items usually do.
function blockHasBareDate(text) {
  if (!DATE_RE.test(text)) return false;
  if (PREFIXED_DATE_RE.test(text)) return false;
  return true;
}

// A code is never the publisher's own brand name — reject candidates that
// occur in the source URL (LootBar on lootbar.com, GamesRadar on
// gamesradar.com, …).
function isSelfBrand(token, sourceUrl) {
  const t = token.toLowerCase();
  if (t.length < 4) return false;
  return typeof sourceUrl === 'string' && sourceUrl.toLowerCase().includes(t);
}

/**
 * Extract candidate codes from an untrusted HTML page.
 * Returns { codes: [{raw, section, expiresAt, snippet}], skipped: 'not-kingshot' }
 */
function extractCodes(html, sourceUrl) {
  const codes = [];
  if (!/kingshot/i.test(html)) return { codes, skipped: 'not-kingshot' };

  const digitOrPrefix = (t) => /[0-9]/.test(t) || KINGSHOT_PREFIX.test(t);

  // JSON-LD high-confidence pass first (structured data, no prose).
  const ldSeen = new Set();
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) return o.forEach(walk);
        if (Array.isArray(o.itemListElement)) {
          for (const it of o.itemListElement) {
            const name = it && (it.name || (it.item && it.item.name));
            // JSON-LD items on a kingshot-relevant page are structured data
            // (no prose around them), so the shape + stoplist + self-brand
            // checks are enough — no digit requirement (letters-only codes
            // like CHILLWEEKEND appear in code lists).
            if (typeof name === 'string' && acceptToken(name) && !isSelfBrand(name, sourceUrl)) {
              const up = name.toUpperCase();
              if (!ldSeen.has(up)) {
                ldSeen.add(up);
                codes.push({ raw: name, section: 'active', expiresAt: null, snippet: '(structured data)' });
              }
            }
          }
        }
        for (const v of Object.values(o)) walk(v);
      };
      walk(JSON.parse(m[1]));
    } catch {
      /* malformed JSON-LD block: ignore, keep scanning */
    }
  }

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  let heading = '';
  const seen = new Set(codes.map((c) => c.raw.toUpperCase()));

  // Ranges of <nav>…</nav> and <footer>…</footer> (navigation menus and
  // site footers never contain code sections). Blocks inside them get no
  // section context, so a stale article heading ("Expired Kingshot codes")
  // cannot turn the footer's genre links (PS5, Pokemon, …) into codes.
  const navRanges = [];
  {
    const rangeRe = /<(nav|footer)\b[^>]*>|<\/(nav|footer)>/gi;
    const stack = [];
    let rm;
    while ((rm = rangeRe.exec(html)) !== null) {
      const isClose = rm[0][1] === '/';
      const tag = (isClose ? rm[2] : rm[1]).toLowerCase();
      if (isClose) {
        const openIdx = stack.pop();
        if (openIdx !== undefined) navRanges.push([openIdx, rm.index + rm[0].length]);
      } else {
        stack.push(rm.index + rm[0].length);
      }
    }
  }
  const inNavScope = (pos) => navRanges.some(([a, b]) => pos >= a && pos <= b);

  // Evaluate one block of text. `text` is what gets gated; `dateText` is
  // where the expiry date is scanned (for <td> cells inside a <tr> we pass
  // the whole row, so an "Expires …" in a sibling cell is attributed to
  // the code's cell).
  const consider = (tag, text, dateText, pos) => {
    // Navigation menus and site footers never contain code sections —
    // skip them wholesale (their genre links "PS5 / Pokemon / …" plus a
    // "Game Codes" menu entry would otherwise read as a code list).
    if (inNavScope(pos)) return;
    const scope = heading;
    const tokens = [...new Set(text.split(/[^A-Za-z0-9-]+/).map((t) => t.replace(/^-+|-+$/g, '')).filter(Boolean))];
    const shaped = tokens.filter(acceptToken);
    if (!shaped.length) return;

    // Kingshot relevance context: a letters-only candidate must appear in a
    // block (or under a heading) that mentions kingshot, or be a known
    // Kingshot code family. Digit codes are accepted on context. This is
    // what keeps related-game brand lists ("Genshin", "Valorant", …) out.
    const hasKingshotCtx = /kingshot/i.test(scope + ' ' + text);
    let cands = shaped.filter((t) => digitOrPrefix(t) || hasKingshotCtx);
    if (!cands.length) return;
    cands = cands.filter((t) => !isSelfBrand(t, sourceUrl));
    if (!cands.length) return;

    // A code block announces itself. Narrative prose never does. A section
    // headed "…Kingshot… code(s)…" is a code section by definition, so its
    // list items are code entries even without per-item copy/redeem text
    // (GamesRadar's "Expired Kingshot codes" list, Lootbar's "Active
    // Kingshot Gift Codes" list).
    const headingIsCodeSection = /kingshot/i.test(scope) && /code/i.test(scope);
    const hasAffordance = STRONG_AFFORDANCE.test(text) || headingIsCodeSection;
    const isCodeTable =
      tag === 'tr' || tag === 'td' ? hasAffordance || TABLE_CONTEXT.test(text) || cands.length >= 2 : false;
    // A "list" of >=3 candidates only counts as a code list when at least
    // one entry looks like a real code (digit or Kingshot family) — brand
    // name clusters (share bars, related games) have none.
    const isCodeList = cands.length >= 3 && cands.some(digitOrPrefix);
    // A single <td> holding exactly one code-shaped token (codes-table
    // layout: "KS0709" in its own cell). No dates in the cell.
    const isSingleCell =
      tag === 'td' && cands.length === 1 && text.length <= 60 && digitOrPrefix(cands[0]) && !blockHasBareDate(text);
    if (!hasAffordance && !isCodeTable && !isCodeList && !isSingleCell) return;

    // Letters-only candidates are not taken from blocks whose dates are
    // unprefixed (article cards, "date added" columns, …).
    if (blockHasBareDate(text)) {
      cands = cands.filter(digitOrPrefix);
      if (!cands.length) return;
    }

    const inExpired =
      /expired|no longer|stopped/i.test(scope) ||
      /(?:has expired|no longer (?:valid|working)|stopped working|did not work)/i.test(text);
    // Explicit in-text evidence that a code is still active ("remains valid
    // until …", "still listed as active", "active as of …").
    const textActive = /(?:still listed as active|remains valid|still valid|active as of)/i.test(text);
    const inActive = /active|working|valid|latest|new|current|all kingshot/i.test(scope) || textActive;
    const section = inExpired ? 'expired' : inActive ? 'active' : 'unknown';

    // Expiry attribution is SENTENCE-level: a "valid until …" date only
    // belongs to the code in the same sentence, so one date in a paragraph
    // that mentions several codes is never smeared across all of them.
    // (A table row is a single sentence, so row dates still attach to the
    // row's code.)
    const sentences = dateText.split(/(?<=[.!?])\s+/);
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expiresFor = (raw) => {
      const pat = new RegExp('\\b' + escapeRe(raw) + '\\b', 'i');
      for (const s of sentences) {
        if (!pat.test(s)) continue;
        const em = s.match(EXPIRY_PREFIX);
        if (em) {
          const d = parseExpiryDate(s.slice(em.index + em[0].length));
          if (d) return d;
        }
      }
      return null;
    };

    for (const raw of cands) {
      const up = raw.toUpperCase();
      if (seen.has(up)) continue;
      seen.add(up);
      codes.push({
        raw,
        section,
        expiresAt: expiresFor(raw),
        // Plain-text snippet (tags already stripped) for admin context.
        snippet: text.slice(0, 200),
      });
    }
  };

  const re = /<(h[1-4]|li|tr|td|div|p)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const inner = m[3];
    if (tag.startsWith('h')) {
      // h1 is usually the page title (e.g. "…All Active…") and would
      // mislabel everything; only h2–h4 set section context.
      if (tag !== 'h1') heading = stripTags(inner).toLowerCase();
      continue;
    }
    const text = stripTags(inner);
    if (!text) continue;
    if (tag === 'div') {
      // A div that wraps block-level children (Vue/Next.js component
      // wrappers) is a CONTAINER: evaluating it would double-count prose,
      // and — worse — this match already consumed the h2/li/td inside it.
      // Skip the evaluation and resume scanning just past the opening tag
      // so the inner blocks are still found.
      if (/<\s*(li|ul|ol|tr|td|table|h[1-6]|div|p|section|article)\b/i.test(inner)) {
        re.lastIndex = m.index + m[0].indexOf('>') + 1;
        continue;
      }
      if (text.length > 100) continue; // only short leaf divs
    }
    if (tag === 'tr') {
      // Row-level pass first (context/affordance/expiry spanning cells),
      // then each cell — the <tr> match consumes the inner <td> tags, so
      // cell-level single-code cells would otherwise never be seen.
      consider('tr', text, text, m.index);
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cm;
      while ((cm = cellRe.exec(inner)) !== null) {
        const cellText = stripTags(cm[1]);
        if (!cellText) continue;
        consider('td', cellText, text, m.index);
      }
      continue;
    }
    consider(tag, text, text, m.index);
  }
  return { codes };
}

// ---------------------------------------------------------------------------
// DB integration
// ---------------------------------------------------------------------------

function sanitizeSnippet(s) {
  return String(s || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

async function upsertCandidate(cand, source) {
  const normalized = cand.raw.toUpperCase();
  const existing = await Gifts.findByNormalized(normalized);

  if (existing) {
    // Known code seen again → refresh check time; promote verification.
    let verification = existing.verification_status;
    if (existing.source && existing.source !== source.name && verification !== 'verified') {
      verification = 'multi-source';
    }
    await Gifts.touchChecked(existing.id, source.name, verification);
    if (cand.section === 'expired') return sourceSaysExpired(existing, source, normalized);
    return { kind: 'duplicate' };
  }

  if (cand.section === 'expired') return { kind: 'expired-found' }; // not worth reviewing

  const info = await Gifts.insertDiscovered({
    code: normalized,
    display_code: cand.raw,
    description: '',
    reward: '',
    max_uses: 1,
    per_member_limit: 1,
    active: false,
    status: 'pending',
    expires_at: cand.expiresAt,
    source: source.name,
    source_url: source.url,
    platform: 'unknown',
    verification_status: 'single-source',
    notes: `Discovered via ${source.name}. Snippet: ${sanitizeSnippet(cand.snippet)}`,
  });
  return { kind: 'new', id: info.lastInsertRowid };
}

async function sourceSaysExpired(existing, source, normalized) {
  const when = new Date().toISOString().slice(0, 10);
  const note = sanitizeSnippet(`Source ${source.name} lists ${normalized} as expired on ${when}. `);
  // Never override an admin-verified code; otherwise record the evidence.
  if (existing.verification_status === 'verified') {
    await Gifts.touchChecked(existing.id, source.name, 'verified', note + existing.notes || '');
    return { kind: 'duplicate' };
  }
  if (existing.status === 'pending' || existing.status === 'approved') {
    await Gifts.setStatus(existing.id, 'expired', note + (existing.notes || ''));
    return { kind: 'source-expired' };
  }
  await Gifts.touchChecked(existing.id, source.name, existing.verification_status, note + (existing.notes || ''));
  return { kind: 'duplicate' };
}

// ---------------------------------------------------------------------------
// Run orchestration
// ---------------------------------------------------------------------------

let running = false;
let lastRun = null;

function isRunning() {
  return running;
}

async function insertLog(triggeredBy) {
  const info = await db
    .prepare('INSERT INTO gift_fetch_logs (triggered_by, status) VALUES (?, ?)').run(triggeredBy, 'running');
  return info.lastInsertRowid;
}

async function runFetch(triggeredBy) {
  if (running) return { started: false, error: 'A fetch is already running.' };
  running = true;
  const startedAt = new Date();
  let logId = null;
  try {
    logId = await insertLog(triggeredBy);
    return await runFetchInner(triggeredBy, startedAt, logId);
  } catch (err) {
    // Never leave a log row stuck at 'running' and never leak the error.
    console.error(`[gift-fetch] ${triggeredBy} run crashed:`, err.message);
    try {
      if (logId) {
        await db
          .prepare(`UPDATE gift_fetch_logs SET finished_at = now(), status = 'failed', error_summary = ? WHERE id = ?`)
          .run(`unexpected error: ${String(err.message).slice(0, 200)}`, logId);
      }
      lastRun = {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        triggeredBy,
        status: 'failed',
        summary: { success: false, newCodes: 0, duplicates: 0, expired: 0, pending: 0 },
      };
    } catch {
      /* logging failure must not mask the original problem */
    }
    return { started: true, triggeredBy, status: 'failed' };
  } finally {
    running = false;
  }
}

async function runFetchInner(triggeredBy, startedAt, logId) {
  const sourceResults = [];
  let newCodes = 0;
  let duplicates = 0;
  let expiredFound = 0;

  let sources = [];
  try {
    sources = (await getSources()).filter((s) => s.enabled);
  } catch (err) {
    sources = [];
    sourceResults.push({ name: '(config)', url: '', ok: false, found: 0, error: `source config unreadable: ${err.message}` });
  }

  // Sequential on purpose: limited frequency per source (brief §15) — no
  // burst of parallel requests against the same hosts.
  for (const source of sources) {
    const t0 = Date.now();
    try {
      const html = await fetchPage(source.url);
      const { codes, skipped } = extractCodes(html, source.url);
      if (skipped) throw new Error(skipped === 'not-kingshot' ? 'page does not look like a Kingshot codes page' : skipped);
      let found = 0;
      for (const cand of codes) {
        const res = await upsertCandidate(cand, source);
        found += 1;
        if (res.kind === 'new') newCodes += 1;
        else if (res.kind === 'source-expired') expiredFound += 1;
        else duplicates += 1;
      }
      sourceResults.push({ name: source.name, url: source.url, ok: true, found, ms: Date.now() - t0 });
    } catch (err) {
      // Per-source isolation: log, continue with the next source.
      sourceResults.push({
        name: source.name,
        url: source.url,
        ok: false,
        found: 0,
        ms: Date.now() - t0,
        error: String(err.message || err).slice(0, 300),
      });
    }
  }

  // Date-based auto-expiry sweep (only rows with a KNOWN expiry — unknown
  // expiry is never auto-expired, per the brief).
  const expiredNow = await Gifts.markExpiredWithPastDate();

  const pendingTotal = await Gifts.pendingCount();
  const anyFailure = sourceResults.some((s) => !s.ok);
  const summary = {
    success: !anyFailure,
    newCodes,
    duplicates,
    expired: expiredFound + expiredNow,
    pending: pendingTotal,
  };

  const finishedAt = new Date();
  const failedNames = sourceResults.filter((s) => !s.ok).map((s) => `${s.name}: ${s.error || 'unknown'}`);
  await db
    .prepare(
      `UPDATE gift_fetch_logs
       SET finished_at = ?, status = ?, sources_checked = ?, sources_failed = ?,
           new_codes = ?, duplicates = ?, expired_found = ?, expired_now = ?,
           pending_total = ?, duration_ms = ?, error_summary = ?, details = ?
       WHERE id = ?`
    ).run(
      finishedAt.toISOString(),
      anyFailure && newCodes === 0 && sourceResults.length > 0 ? 'failed' : 'completed',
      sourceResults.length,
      sourceResults.filter((s) => !s.ok).length,
      newCodes,
      duplicates,
      expiredFound,
      expiredNow,
      pendingTotal,
      finishedAt - startedAt,
      failedNames.slice(0, 3).join(' | ').slice(0, 400) || null,
      JSON.stringify(sourceResults),
      logId
    );

  const detail = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    triggeredBy,
    status: anyFailure && newCodes === 0 && sourceResults.length > 0 ? 'failed' : 'completed',
    summary,
  };
  lastRun = detail;
  console.log(
    `[gift-fetch] ${triggeredBy} run finished: new=${newCodes} dupes=${duplicates} ` +
      `expiredFound=${expiredFound} autoExpired=${expiredNow} pending=${pendingTotal} ` +
      `failedSources=${sourceResults.filter((s) => !s.ok).length}`
  );
  return { started: true, ...detail };
}

async function getStatus() {
  const [pending, counts] = await Promise.all([Gifts.pendingCount(), Gifts.statusCounts()]);
  return {
    running,
    lastRun,
    pendingCount: pending,
    statusCounts: counts,
  };
}

async function getLogs(limit = 8) {
  const rows = await db
    .prepare('SELECT * FROM gift_fetch_logs ORDER BY started_at DESC, id DESC LIMIT ?')
    .all(limit);
  return rows.map((r) => {
    let details = [];
    try {
      details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details || [];
    } catch {
      details = [];
    }
    return {
      id: r.id,
      started_at: r.started_at,
      finished_at: r.finished_at,
      triggered_by: r.triggered_by,
      status: r.status,
      sources_checked: r.sources_checked,
      sources_failed: r.sources_failed,
      new_codes: r.new_codes,
      duplicates: r.duplicates,
      expired_found: r.expired_found,
      expired_now: r.expired_now,
      pending_total: r.pending_total,
      duration_ms: r.duration_ms,
      error_summary: r.error_summary,
      sources: details.map((s) => ({
        name: s.name,
        ok: s.ok,
        found: s.found,
        error: s.ok ? undefined : s.error,
      })),
    };
  });
}

module.exports = { runFetch, isRunning, getStatus, getLogs, getSources, saveSources, extractCodes, acceptToken, FETCH_TIMEOUT_MS };
