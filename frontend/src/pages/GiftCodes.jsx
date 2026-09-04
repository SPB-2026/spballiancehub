import React, { useEffect, useRef, useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState, Button, Badge } from '../components/ui.jsx';
import { IconGift, IconClock, IconCopy } from '../components/icons.jsx';
import { fmtDate } from '../utils/format.js';

function statusOf(g) {
  if (!g.active) return { kind: 'gray', label: 'Inactive' };
  if (g.expired) return { kind: 'red', label: 'Expired' };
  if (g.remaining <= 0) return { kind: 'orange', label: 'Used up' };
  return { kind: 'green', label: 'Valid' };
}

// Clipboard with two channels: the modern Clipboard API first (always writes
// exactly the given string), then a legacy hidden-textarea fallback for
// browsers/contexts where the API is unavailable (old browsers, non-secure
// contexts, denied permission). Returns a real success flag — callers must
// never show "Copied!" on a failure.
async function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* permission denied or unavailable — try the legacy path */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch { /* very old engines */ }
    let ok = false;
    try {
      // Safety gate: only run execCommand('copy') when the ACTIVE selection
      // is inside our own textarea. Without this, some browsers would copy
      // whatever the user had selected elsewhere on the page (e.g. the whole
      // gift-code list) instead of this single code.
      const sel = typeof document.getSelection === 'function' ? document.getSelection() : null;
      const inOurs = Boolean(sel && sel.rangeCount > 0 && ta.contains(sel.getRangeAt(0).commonAncestorContainer));
      if (inOurs) ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    } finally {
      document.body.removeChild(ta);
    }
    return ok;
  } catch {
    return false;
  }
}

export default function GiftCodes() {
  const toast = useToast();
  const codes = useAsync(() => api.get('/gifts/list'), []);

  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState(null);

  // Per-code feedback state: { [giftCodeId]: 'copied' | 'failed' }.
  // Keyed by the code's id so every card's button is fully independent —
  // copying code A can never touch code B's button.
  const [copyState, setCopyState] = useState({});
  const copyTimers = useRef({});

  useEffect(() => () => {
    Object.values(copyTimers.current).forEach(clearTimeout);
  }, []);

  async function copy(g) {
    const ok = await copyText(g.code);
    const state = ok ? 'copied' : 'failed';
    setCopyState((s) => ({ ...s, [g.id]: state }));
    if (ok) toast.success('Gift code copied!', `${g.code} — paste it in Kingshot's gift code screen.`);
    else toast.error('Unable to copy', 'Please copy the code manually.');
    // Restore the normal button after ~2s. Rapid re-clicks restart the window
    // (previous timer is cleared first); the reset only clears ITSELF, so a
    // newer click's state is never clobbered.
    if (copyTimers.current[g.id]) clearTimeout(copyTimers.current[g.id]);
    copyTimers.current[g.id] = setTimeout(() => {
      copyTimers.current[g.id] = null;
      setCopyState((s) => {
        if (s[g.id] !== state) return s;
        const { [g.id]: _done, ...rest } = s;
        return rest;
      });
    }, 2000);
  }

  async function redeem(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setResult(null);
    try {
      const res = await api.post('/gifts/redeem', { code });
      setResult({ ok: true, message: res.message, reward: res.reward });
      setCode('');
      toast.success('Gift code redeemed', res.reward || res.message);
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Gift <span className="flourish">Codes</span></h1>
          <p className="page-sub">Copy a verified code and enter it in Kingshot, or redeem an alliance code directly on your account.</p>
        </div>
      </div>

      {/* Available codes */}
      <section className="section" style={{ marginTop: 0 }} aria-label="Available gift codes">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">🎁</span> Available Gift Codes</h2>
          {codes.data ? <span className="view-all" style={{ cursor: 'default' }}>{codes.data.length} codes</span> : null}
        </div>
        {codes.loading ? <LoadingBox label="Loading gift codes…" /> :
          codes.error ? <ErrorState error={codes.error} onRetry={codes.reload} /> :
          codes.data.length === 0 ? (
            <EmptyState icon="🎁" title="No gift codes yet">The command will publish alliance codes here.</EmptyState>
          ) : (
            <div className="grid grid-3">
              {codes.data.map((g) => {
                const st = statusOf(g);
                const cp = copyState[g.id]; // 'copied' | 'failed' | undefined — this card's own state only
                return (
                  <div className="card card-pad card-hover gift-card" key={g.id}>
                    <div className="gc-top">
                      <span className="gc-code" title="Tap to select the whole code — then use your browser&#39;s copy">{g.code}</span>
                      <Badge kind={st.kind} dot={st.kind === 'green'}>{st.label}</Badge>
                    </div>
                    {g.reward || g.description ? <div className="gc-desc">{g.reward || g.description}</div> : null}
                    <div className="gc-date">
                      <IconClock />
                      <span>{g.expires_at ? `Expires ${fmtDate(g.expires_at)}` : `Published ${fmtDate(g.created_at)}`}</span>
                    </div>
                    <div className="gc-foot">
                      {/* type="button": this ONLY copies — no form submit, no navigation,
                          no reload. Feedback is per-card via copyState[g.id]. */}
                      <button
                        type="button"
                        className={`btn-copy-green${cp === 'copied' ? ' is-copied' : ''}${cp === 'failed' ? ' is-failed' : ''}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copy(g); }}
                        aria-label={`Copy gift code ${g.code}`}
                      >
                        <span aria-live="polite">
                          {cp === 'copied' ? '✓ Copied!'
                            : cp === 'failed' ? 'Copy failed — tap the code'
                            : <><IconCopy /> Tap Copy in game</>}
                        </span>
                      </button>
                      <span className="gc-verified">verified</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </section>

      {/* Redeem widget — public, no login required */}
      <section className="section" aria-label="Redeem a code">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">🔑</span> Redeem a Code</h2>
        </div>
        <div className="card card-gold gift-widget">
          <span className="stat-icon" aria-hidden="true"><IconGift /></span>
          <div className="gift-input-row">
            <form onSubmit={redeem} style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
              <input
                className="input gift-input"
                style={{ flex: 1, minWidth: 180 }}
                placeholder="Enter code — e.g. SPB-START-25"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                aria-label="Gift code"
                maxLength={32}
              />
              <Button type="submit" loading={redeeming}>Redeem</Button>
            </form>
            {result ? (
              <div className={result.ok ? 'form-success' : 'form-error'} role="status">{result.message}</div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
