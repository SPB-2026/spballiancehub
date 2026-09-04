import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconGift, IconCheck, IconCopy, IconClock, IconClose, IconGlobe } from '../components/icons.jsx';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

// Lifecycle badge for the main table.
function StatusBadge({ g }) {
  if (g.status === 'rejected') return <Badge kind="red">rejected</Badge>;
  if (g.status === 'invalid') return <Badge kind="red">invalid</Badge>;
  if (g.status === 'expired' || g.expired) return <Badge kind="orange">expired</Badge>;
  if (g.status === 'pending') return <Badge kind="gold" dot>pending</Badge>;
  return <Badge kind={g.active ? 'green' : 'gray'} dot>{g.active ? 'published' : 'off'}</Badge>;
}

function SourceCell({ g }) {
  if (!g.source) return <span className="text-dim">manual</span>;
  const v = g.verification_status || 'unverified';
  const vTitle =
    v === 'verified' ? 'Verified by admin' :
    v === 'multi-source' ? 'Seen on more than one source' :
    v === 'single-source' ? 'Seen on one source only' : 'Not verified';
  return (
    <span title={vTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {g.source_url ? (
        <a href={g.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {g.source} <IconGlobe size={12} />
        </a>
      ) : (
        g.source
      )}
      {v !== 'unverified' ? (
        <span className="text-dim" style={{ fontSize: 11 }}>{v === 'verified' ? '✓' : v === 'multi-source' ? '2+' : '1×'}</span>
      ) : null}
    </span>
  );
}

export default function AdminGifts() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/gifts'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [redemptionsFor, setRedemptionsFor] = useState(null);
  const [redemptions, setRedemptions] = useState(null);
  const [copied, setCopied] = useState(null);

  // ── Fetch control ─────────────────────────────────────────────────────────
  const [fetchStatus, setFetchStatus] = useState(null);
  const [logs, setLogs] = useState(null);
  const wasRunning = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.get('/admin/gifts/fetch/status');
      setFetchStatus(s);
      if (wasRunning.current && !s.running) {
        // A run just finished — refresh the code list + history.
        reload();
        loadLogs();
      }
      wasRunning.current = s.running;
    } catch {
      /* status is cosmetic; keep whatever we had */
    }
  }, [reload]);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await api.get('/admin/gifts/fetch/logs?limit=5'));
    } catch {
      /* history is cosmetic */
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadLogs();
  }, [loadStatus, loadLogs]);

  useEffect(() => {
    if (!fetchStatus || !fetchStatus.running) return undefined;
    const t = setInterval(loadStatus, 5000);
    return () => clearInterval(t);
  }, [fetchStatus, loadStatus]);

  async function startFetch() {
    try {
      await api.post('/admin/gifts/fetch');
      toast.success('Fetch started', 'Checking sources in the background…');
      loadStatus();
    } catch (err) {
      toast.error('Fetch failed to start', err.message);
    }
  }

  // ── Pending review actions ────────────────────────────────────────────────
  async function review(g, action) {
    setBusy(true);
    try {
      await api.post(`/admin/gifts/${g.id}/${action}`);
      const msg =
        action === 'approve' ? 'Approved & published' :
        action === 'reject' ? 'Rejected' : 'Marked expired';
      toast.success(msg, g.display_code || g.code);
      reload();
      loadStatus();
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Source configuration ──────────────────────────────────────────────────
  const [sources, setSources] = useState(null);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '' });
  const [sourcesSaving, setSourcesSaving] = useState(false);
  const [sourcesDirty, setSourcesDirty] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      const r = await api.get('/admin/gifts/sources');
      setSources(r.sources);
      setSourcesLoaded(true);
    } catch {
      /* config panel is optional */
    }
  }, []);
  useEffect(() => { loadSources(); }, [loadSources]);

  function mutateSources(next) {
    setSources(next);
    setSourcesDirty(true);
  }
  function addSource() {
    const name = newSource.name.trim();
    const url = newSource.url.trim();
    if (name.length < 2) { toast.error('Source name too short'); return; }
    if (!/^https:\/\//i.test(url)) { toast.error('Source URL must be https'); return; }
    if (sources.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A source with that name exists');
      return;
    }
    mutateSources([...sources, { name, url, enabled: true, note: '' }]);
    setNewSource({ name: '', url: '' });
  }
  async function saveSources() {
    setSourcesSaving(true);
    try {
      const r = await api.put('/admin/gifts/sources', { sources });
      setSources(r.sources);
      setSourcesDirty(false);
      toast.success('Sources saved');
    } catch (err) {
      toast.error('Save failed', err.message);
    } finally {
      setSourcesSaving(false);
    }
  }

  // ── Existing CRUD ─────────────────────────────────────────────────────────
  function emptyForm() {
    return { code: '', description: '', reward: '', max_uses: 1, per_member_limit: 1, active: true, expires_at: '' };
  }

  function openNew() { setForm(emptyForm()); setFormError(''); setEditing('new'); }
  function openEdit(g) {
    setForm({
      code: g.code, description: g.description, reward: g.reward,
      max_uses: g.max_uses, per_member_limit: g.per_member_limit,
      active: Boolean(g.active), expires_at: toLocalInput(g.expires_at),
    });
    setFormError('');
    setEditing(g);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      ...form,
      max_uses: Number(form.max_uses),
      per_member_limit: Number(form.per_member_limit),
      expires_at: form.expires_at ? new Date(`${form.expires_at}:00Z`).toISOString() : null,
    };
    try {
      if (editing === 'new') {
        await api.post('/admin/gifts', payload);
        toast.success('Gift code created', form.code.toUpperCase());
      } else {
        await api.put(`/admin/gifts/${editing.id}`, payload);
        toast.success('Gift code updated', form.code.toUpperCase());
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(g) {
    try {
      await api.put(`/admin/gifts/${g.id}`, { active: !g.active });
      toast.success(g.active ? 'Deactivated' : 'Activated', g.code);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function doRemove(g) {
    setBusy(true);
    try {
      await api.del(`/admin/gifts/${g.id}`);
      toast.info('Gift code deleted', g.code);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function showRedemptions(g) {
    setRedemptionsFor(g);
    setRedemptions(null);
    try {
      setRedemptions(await api.get(`/admin/gifts/${g.id}/redemptions`));
    } catch (err) {
      toast.error('Could not load redemptions', err.message);
      setRedemptionsFor(null);
    }
  }

  async function copyCode(g) {
    const ok = await copyText(g.code);
    if (ok) {
      setCopied(g.id);
      setTimeout(() => setCopied(null), 1500);
    } else {
      toast.error('Copy failed');
    }
  }

  const all = data || [];
  const pending = all.filter((g) => g.status === 'pending');
  const listed = all.filter((g) => g.status !== 'pending');

  const columns = [
    {
      key: 'code', label: 'Code', render: (g) => (
        <div>
          <span className="mono" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>{g.display_code || g.code}</span>
          <div className="text-dim" style={{ fontSize: 11 }}>
            {g.discovered_at ? `discovered ${fmtDateTime(g.discovered_at)}` : `created ${fmtDateTime(g.created_at)}`}
          </div>
        </div>
      ),
    },
    { key: 'state', label: 'Status', render: (g) => <div className="admin-badge-row"><StatusBadge g={g} /></div> },
    { key: 'source', label: 'Source', render: (g) => <SourceCell g={g} /> },
    { key: 'reward', label: 'Reward', render: (g) => <div><div>{g.reward || '—'}</div>{g.description ? <div className="text-dim" style={{ fontSize: 11.5 }}>{g.description}</div> : null}</div> },
    {
      key: 'uses', label: 'Uses', align: 'right', render: (g) => (
        <span className="mono">{num(g.used_count)} / {num(g.max_uses)} <span className="text-dim">(left: {g.remaining})</span></span>
      ),
    },
    { key: 'per_member_limit', label: 'Per member', align: 'right', render: (g) => <span className="mono">{g.per_member_limit}</span> },
    {
      key: 'expires_at', label: 'Expires', render: (g) => (
        <span className="mono" style={{ fontSize: 12 }}>{g.expires_at ? fmtDateTime(g.expires_at) : 'unknown'}</span>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (g) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => copyCode(g)} title="Copy code">
            {copied === g.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => showRedemptions(g)} title="View redemption records"><IconGift size={14} /></button>
          {g.status === 'approved' && !g.expired ? (
            <button className="btn btn-ghost btn-sm" onClick={() => review(g, 'mark-expired')} title="Mark this code expired">Expire</button>
          ) : null}
          {g.status === 'expired' ? (
            <Button size="sm" variant="ghost" loading={busy} onClick={() => review(g, 'approve')} title="Re-publish (overrides source expiry evidence)">
              Re-approve
            </Button>
          ) : null}
          <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(g)} title={g.active ? 'Deactivate' : 'Activate'}>
            {g.active ? 'Deactivate' : 'Activate'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)} title="Edit code"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(g)} title="Delete code"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  const running = Boolean(fetchStatus && fetchStatus.running);
  const last = fetchStatus && fetchStatus.lastRun;
  const statusKind = running ? 'gold' : last ? (last.status === 'completed' ? 'green' : 'red') : 'gray';
  const statusLabel = running ? 'Fetching' : last ? (last.status === 'completed' ? 'Completed' : 'Failed') : 'Idle';

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Gift <span className="text-gold">Codes</span></h1>
          <p>Create, edit, activate and delete codes. Members redeem them against their own account.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>Create code</Button>
      </div>

      {/* ── Automatic fetch control ─────────────────────────────────────── */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge kind={statusKind} dot>{statusLabel}</Badge>
            <span style={{ fontSize: 13 }}>
              <strong>Automatic Kingshot code fetch</strong>
              {' — '}
              {last ? (
                <>last {last.triggeredBy} run {fmtDateTime(last.finishedAt || last.startedAt)}</>
              ) : (
                'no runs yet'
              )}
              {fetchStatus && fetchStatus.next_run_at ? (
                <span className="text-dim"> · next automatic {fmtDateTime(fetchStatus.next_run_at)} (every {Math.round((fetchStatus.interval_sec || 0) / 3600)}h)</span>
              ) : null}
            </span>
          </div>
          <Button icon={<IconClock size={15} />} loading={running} onClick={startFetch} variant={running ? 'ghost' : 'gold'}>
            {running ? 'Fetching…' : 'Fetch new codes'}
          </Button>
        </div>
        {last && last.summary ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }} className="mono">
            <span><span style={{ color: 'var(--gold-bright)' }}>{last.summary.newCodes}</span> new</span>
            <span><span className="text-dim">{last.summary.duplicates}</span> duplicates</span>
            <span><span className="text-dim">{last.summary.expired}</span> expired</span>
            <span><span style={{ color: 'var(--gold-bright)' }}>{last.summary.pending}</span> awaiting review</span>
          </div>
        ) : null}
        {fetchStatus && fetchStatus.pendingCount > 0 ? (
          <div style={{ marginTop: 8, fontSize: 12.5 }} className="text-dim">
            {fetchStatus.pendingCount} fetched code{fetchStatus.pendingCount === 1 ? '' : 's'} waiting for review below — members only see codes you approve.
          </div>
        ) : null}
      </div>

      {/* ── Pending review queue ────────────────────────────────────────── */}
      {pending.length > 0 ? (
        <div className="card card-pad" style={{ marginBottom: 18, borderLeft: '3px solid var(--gold, #c9a227)' }}>
          <div className="section-head" style={{ marginBottom: 10 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Pending review <Badge kind="gold" dot>{pending.length}</Badge></h3>
            <span className="text-dim" style={{ fontSize: 12 }}>
              Fetched from public sources — not visible to members until approved.
            </span>
          </div>
          <div className="table-wrap" style={{ minWidth: 0 }}>
            <table className="table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Code</th><th>Source</th><th>Discovered</th><th>Expires</th><th>Platform</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span className="mono" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>{g.display_code || g.code}</span>
                      {g.notes ? <div className="text-dim" style={{ fontSize: 11, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.notes}>{g.notes}</div> : null}
                    </td>
                    <td>
                      <SourceCell g={g} />
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{g.discovered_at ? fmtDateTime(g.discovered_at) : fmtDateTime(g.created_at)}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{g.expires_at ? fmtDateTime(g.expires_at) : <span className="text-dim">unknown</span>}</td>
                    <td>
                      {g.platform === 'android' ? <Badge kind="blue">android</Badge> : <Badge kind="gray">unknown</Badge>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="gold" loading={busy} onClick={() => review(g, 'approve')}>Approve &amp; publish</Button>
                        <Button size="sm" variant="ghost" loading={busy} onClick={() => review(g, 'reject')}><IconClose size={13} /> Reject</Button>
                        <Button size="sm" variant="ghost" loading={busy} onClick={() => review(g, 'mark-expired')}>Mark expired</Button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirm(g)} title="Delete"><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ── All codes (published, expired, rejected) ────────────────────── */}
      <AdminTable
        columns={columns}
        rows={listed}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🎁"
        emptyTitle="No gift codes"
        emptyText="Create a code, or fetch codes from public sources."
      />

      {/* ── Fetch history ───────────────────────────────────────────────── */}
      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-head" style={{ marginBottom: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Fetch history</h3>
        </div>
        {!logs ? (
          <p className="text-dim" style={{ fontSize: 12.5 }}>No fetch runs recorded yet.</p>
        ) : logs.length === 0 ? (
          <p className="text-dim" style={{ fontSize: 12.5 }}>No fetch runs recorded yet.</p>
        ) : (
          <div className="table-wrap" style={{ minWidth: 0 }}>
            <table className="table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Started</th><th>Trigger</th><th>Status</th><th>Sources</th>
                  <th>New</th><th>Dupes</th><th>Expired</th><th>Duration</th><th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{fmtDateTime(l.started_at)}</td>
                    <td>{l.triggered_by}</td>
                    <td>
                      <Badge kind={l.status === 'completed' ? 'green' : l.status === 'running' ? 'gold' : 'red'} dot>{l.status}</Badge>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {l.sources_checked} checked{l.sources_failed > 0 ? <span style={{ color: 'var(--red, #d05050)' }}> · {l.sources_failed} failed</span> : null}
                    </td>
                    <td className="mono">{l.new_codes}</td>
                    <td className="mono">{l.duplicates}</td>
                    <td className="mono">{l.expired_found + l.expired_now}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{l.duration_ms != null ? `${(l.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 260 }}>
                      {l.error_summary ? <span title={l.sources.filter((s) => !s.ok).map((s) => `${s.name}: ${s.error || ''}`).join(' | ')}>{l.error_summary}</span> : <span className="text-dim">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Source configuration (admin-only) ───────────────────────────── */}
      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-head" style={{ marginBottom: 10 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Fetch sources</h3>
          <span className="text-dim" style={{ fontSize: 12 }}>
            Verified public pages that list Kingshot gift codes. Blocked (403) sources stay disabled — the fetcher never bypasses anti-bot.
          </span>
        </div>
        {!sources ? (
          <p className="text-dim" style={{ fontSize: 12.5 }}>Loading sources…</p>
        ) : (
          <>
            <div className="table-wrap" style={{ minWidth: 0 }}>
              <table className="table" style={{ minWidth: 480 }}>
                <thead>
                  <tr><th>Name</th><th>URL</th><th style={{ width: 90 }}>Enabled</th><th style={{ width: 60 }} /></tr>
                </thead>
                <tbody>
                  {sources.map((s, i) => (
                    <tr key={`${s.name}-${i}`}>
                      <td>{s.name}{s.note ? <div className="text-dim" style={{ fontSize: 11 }}>{s.note}</div> : null}</td>
                      <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) => mutateSources(sources.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => mutateSources(sources.filter((_, j) => j !== i))} title="Remove source">
                          <IconTrash size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
              <input
                className="input"
                style={{ flex: '0 1 180px' }}
                placeholder="Source name"
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
              />
              <input
                className="input"
                style={{ flex: '1 1 300px' }}
                placeholder="https://…"
                value={newSource.url}
                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
              />
              <Button variant="ghost" size="sm" onClick={addSource}><IconPlus size={14} /> Add</Button>
              <div style={{ flex: 1 }} />
              <Button loading={sourcesSaving} disabled={!sourcesDirty} onClick={saveSources}>
                {sourcesDirty ? 'Save sources' : 'Sources saved'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Create / edit modal ─────────────────────────────────────────── */}
      {editing ? (
        <Modal
          title={editing === 'new' ? 'Create Gift Code' : `Edit ${editing.code}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Create code' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="settings-form">
              <Field label="Code" id="g-code" hint="Letters, numbers and dashes.">
                <input id="g-code" className="input gift-input" value={form.code} maxLength={32} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
              </Field>
              <Field label="Reward (shown to member)" id="g-reward">
                <input id="g-reward" className="input" value={form.reward} maxLength={200} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
              </Field>
              <Field label="Max uses" id="g-max">
                <input id="g-max" type="number" min="1" className="input" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </Field>
              <Field label="Per-member limit" id="g-per">
                <input id="g-per" type="number" min="1" className="input" value={form.per_member_limit} onChange={(e) => setForm({ ...form, per_member_limit: e.target.value })} />
              </Field>
              <Field label="Expires (UTC, optional)" id="g-exp">
                <input id="g-exp" type="datetime-local" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </Field>
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
            <Field label="Description (internal)" id="g-desc">
              <textarea id="g-desc" className="textarea" style={{ minHeight: 60 }} value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {/* ── Redemptions modal ───────────────────────────────────────────── */}
      {redemptionsFor ? (
        <Modal
          title={`Redemptions — ${redemptionsFor.code}`}
          onClose={() => { setRedemptionsFor(null); setRedemptions(null); }}
        >
          {!redemptions ? (
            <div className="loading-box"><div className="spinner" /><span>Loading…</span></div>
          ) : redemptions.length === 0 ? (
            <p className="text-dim" style={{ fontSize: 13.5 }}>No redemptions for this code yet.</p>
          ) : (
            <div className="table-wrap" style={{ minWidth: 0 }}>
              <table className="table" style={{ minWidth: 420 }}>
                <thead>
                  <tr><th>Member</th><th>Game User ID</th><th>Redeemed at</th></tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.member_name}</td>
                      <td className="mono text-gold">{r.game_user_id}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{fmtDateTime(r.redeemed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      ) : null}

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      {confirm ? (
        <ConfirmDialog
          title="Delete gift code?"
          message={`“${confirm.code}” and its redemption records will be permanently deleted.`}
          confirmLabel="Delete code"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}

function num(n) {
  return Number(n).toLocaleString();
}
