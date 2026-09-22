import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { num, fmtDate, formatTownCenter } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconBolt, IconSearch, IconRefresh, IconUsers, IconCheck, IconClose } from '../components/icons.jsx';

const EMPTY = {
  game_user_id: '', email: '', name: '', role: 'R1', status: 'active',
  bio: '', contributions: 0, score: 0, town_center: '', join_date: new Date().toISOString().slice(0, 10),
  avatar: '', photoFile: null, photoPreview: null,
};

const ROLE_BADGE = { R5: 'gold', R4: 'gold', R3: 'blue', R2: 'gray', R1: 'gray' };

export default function AdminMembers() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/members'), []);
  const { data: review, reload: reloadReview } = useAsync(() => api.get('/admin/mightpulse/review'), []);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | member
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = (data || []).filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.game_user_id, m.email].some((val) => String(val || '').toLowerCase().includes(q));
  });

  function openNew() { setForm(EMPTY); setFormError(''); setEditing('new'); }
  function openEdit(m) {
    setForm({
      game_user_id: m.game_user_id, email: m.email, name: m.name, role: m.role, status: m.status,
      bio: m.bio || '', contributions: m.contributions, score: m.score, town_center: m.town_center || '', join_date: m.join_date,
      avatar: m.avatar || '', photoFile: null, photoPreview: null,
    });
    setFormError('');
    setEditing(m);
  }

  function onPhotoPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      setFormError('Photo must be a PNG, JPG or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 1024 * 1024) {
      setFormError('Photo must be 1 MB or smaller.');
      e.target.value = '';
      return;
    }
    setFormError('');
    setForm((f) => ({ ...f, photoFile: file, photoPreview: URL.createObjectURL(file), avatar: '' }));
  }

  function clearPhoto(e) {
    e?.preventDefault();
    setForm((f) => {
      if (f.photoPreview) URL.revokeObjectURL(f.photoPreview);
      return { ...f, photoFile: null, photoPreview: null, avatar: null };
    });
  }

  async function save(e) {
    e.preventDefault();
    const gid = String(form.game_user_id || '').trim();
    if (!/^\d{9}$/.test(gid)) {
      setFormError('Game User ID must be exactly 9 digits (numbers only).');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, avatar: form.avatar === '' ? undefined : form.avatar };
      delete payload.photoFile;
      delete payload.photoPreview;
      let targetId = null;
      if (editing === 'new') {
        const created = await api.post('/admin/members', payload);
        targetId = created?.id ?? created?.member?.id;
        toast.success('Member added', `${form.name} was added to the roster.`);
      } else {
        await api.put(`/admin/members/${editing.id}`, payload);
        targetId = editing.id;
        toast.success('Member updated', `${form.name}'s record was saved.`);
      }
      if (form.photoFile) {
        await api.upload(`/admin/members/${targetId}/photo`, form.photoFile, 'avatar');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function doRemove(m) {
    setBusy(true);
    try {
      await api.del(`/admin/members/${m.id}`);
      toast.info('Member removed', `${m.name} no longer has access.`);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Remove failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetStats(m) {
    setBusy(true);
    try {
      await api.post(`/admin/members/${m.id}/reset-stats`);
      toast.success('Stats reset', `${m.name}'s contributions and power are set to zero.`);
      reload();
    } catch (err) {
      toast.error('Reset failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await api.post('/admin/mightpulse/sync');
      toast.success('Sync complete', `${result.updated} updated · ${result.queued} new found · ${result.flagged} flagged as possibly left.`);
      reload();
      reloadReview();
    } catch (err) {
      toast.error('Sync failed', err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function approveOne(id) {
    setReviewBusy(true);
    try {
      await api.post(`/admin/mightpulse/pending/${id}/approve`);
      reload();
      reloadReview();
    } catch (err) {
      toast.error('Add failed', err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  async function approveAll() {
    setReviewBusy(true);
    try {
      const result = await api.post('/admin/mightpulse/pending/approve-all');
      const addedCount = result.created?.length ?? 0;
      const failedCount = result.failed?.length ?? 0;
      if (failedCount > 0) {
        toast.error('Some members failed', `${addedCount} added, ${failedCount} failed — they remain in the pending list.`);
      } else {
        toast.success('Members added', `${addedCount} member${addedCount === 1 ? '' : 's'} added to your roster.`);
      }
      reload();
      reloadReview();
    } catch (err) {
      toast.error('Bulk add failed', err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  async function ignoreOne(id) {
    setReviewBusy(true);
    try {
      await api.del(`/admin/mightpulse/pending/${id}`);
      reloadReview();
    } catch (err) {
      toast.error('Failed', err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  async function dismissMissing(id) {
    setReviewBusy(true);
    try {
      await api.post(`/admin/mightpulse/missing/${id}/dismiss`);
      toast.info('Cleared', 'No longer flagged as possibly left.');
      reload();
      reloadReview();
    } catch (err) {
      toast.error('Failed', err.message);
    } finally {
      setReviewBusy(false);
    }
  }

  const pendingCount = review?.pending?.length || 0;
  const missingCount = review?.missing?.length || 0;
  const reviewCount = pendingCount + missingCount;

  const columns = [
    {
      key: 'member', label: 'Member', render: (m) => (
        <div className="flex items-center gap-1">
          <Avatar src={m.avatar} name={m.name} size={30} />
          <div>
            <div style={{ fontWeight: 600 }}>
              {m.name}
              {m.mp_missing ? (
                <span style={{ marginLeft: 6, display: 'inline-block' }}>
                  <Badge kind="red">Left?</Badge>
                </span>
              ) : null}
            </div>
            <div className="text-dim" style={{ fontSize: 11.5 }}>{m.bio ? m.bio.slice(0, 40) : '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'game_user_id', label: 'Game User ID', render: (m) => <span className="mono text-gold">{m.game_user_id}</span> },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Role', render: (m) => (
        <select className="select" style={{ width: 90, padding: '6px 28px 6px 10px' }} value={m.role} onChange={(e) => quickUpdate(m, { role: e.target.value }, `Role set to ${e.target.value}`)}>
          {['R5', 'R4', 'R3', 'R2', 'R1'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ),
    },
    {
      key: 'status', label: 'Status', render: (m) => (
        <select className="select" style={{ width: 110, padding: '6px 28px 6px 10px' }} value={m.status} onChange={(e) => quickUpdate(m, { status: e.target.value }, `Status set to ${e.target.value}`)}>
          {['active', 'inactive', 'banned'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { key: 'contributions', label: 'Contributions', align: 'right', render: (m) => <span className="mono">{num(m.contributions)}</span> },
    { key: 'score', label: 'Power', align: 'right', render: (m) => <span className="mono">{num(m.score)}</span> },
    { key: 'town_center', label: 'Town Center', align: 'right', render: (m) => <span className="mono">{formatTownCenter(m.town_center) || '—'}</span> },
    { key: 'join_date', label: 'Joined', render: (m) => <span className="mono" style={{ fontSize: 12.5 }}>{fmtDate(m.join_date)}</span> },
    {
      key: 'actions', label: '', align: 'right', render: (m) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => resetStats(m)} title="Reset contributions and power to zero"><IconBolt size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)} title="Edit member"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(m)} title="Remove member"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  async function quickUpdate(m, patch, msg) {
    try {
      await api.put(`/admin/members/${m.id}`, patch);
      toast.success('Updated', msg);
      reload();
    } catch (err) {
      toast.error('Update failed', err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Member <span className="text-gold">Management</span></h1>
          <p>Private data is visible here only. Regular members see public profiles exclusively.</p>
        </div>
        <div className="flex items-center gap-2 wrap">
          <div style={{ position: 'relative' }}>
            <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ width: 230, paddingLeft: 34 }}
              placeholder="Search name, ID or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search members"
            />
          </div>
          <Button variant="ghost" icon={<IconRefresh />} loading={syncing} onClick={syncNow}>Sync now</Button>
          <Button icon={<IconPlus />} onClick={openNew}>Add member</Button>
        </div>
      </div>

      {reviewCount > 0 ? (
        <button type="button" className="mp-review-banner" onClick={() => setReviewOpen(true)}>
          <IconUsers size={16} />
          <span>
            {pendingCount > 0 ? <><b>{pendingCount}</b> new member{pendingCount === 1 ? '' : 's'} found</> : null}
            {pendingCount > 0 && missingCount > 0 ? ' · ' : null}
            {missingCount > 0 ? <><b>{missingCount}</b> flagged as possibly left</> : null}
          </span>
          <span className="mp-review-banner-cta">Review →</span>
        </button>
      ) : null}

      <AdminTable
        columns={columns}
        rows={filtered}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🛡️"
        emptyTitle={query ? 'No members match your search' : 'No members yet'}
        emptyText={query ? `Nothing found for “${query}”.` : 'Add your first member with their Game User ID.'}
      />
      {!query && data ? (
        <p className="text-dim mt-1" style={{ fontSize: 12.5 }}>
          {filtered.length} of {data.length} member{data.length === 1 ? '' : 's'}
        </p>
      ) : null}

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add Member' : `Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Add member' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="settings-form">
              <Field label="Game User ID" id="m-gid" hint="Exactly 9 digits. Used with email to sign in.">
                <input
                  id="m-gid"
                  className="input"
                  value={form.game_user_id}
                  onChange={(e) => setForm({ ...form, game_user_id: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                  required
                  maxLength={9}
                  inputMode="numeric"
                  pattern="\d{9}"
                  title="Enter the 9-digit Kingshot Game User ID"
                />
              </Field>
              <Field label="Email" id="m-email" hint="Optional.">
                <input id="m-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={160} />
              </Field>
              <Field label="Display name" id="m-name">
                <input id="m-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={40} />
              </Field>
              <Field label="Role (rank)" id="m-role" hint="R5 is the highest rank, R1 the newest.">
                <select id="m-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['R5', 'R4', 'R3', 'R2', 'R1'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Status" id="m-status">
                <select id="m-status" className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {['active', 'inactive', 'banned'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Join date" id="m-join">
                <input id="m-join" type="date" className="input" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} />
              </Field>
              <Field label="Contributions" id="m-contrib">
                <input id="m-contrib" type="number" min="0" className="input" value={form.contributions} onChange={(e) => setForm({ ...form, contributions: e.target.value })} />
              </Field>
              <Field label="Power" id="m-score" hint="Alliance Power — decides the order within each rank.">
                <input id="m-score" type="number" min="0" max="100000000000" className="input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
              </Field>
              <Field label="Town Center" id="m-tc" hint="Level (1–30), or the Truegold tier number past 30 (e.g. 35 = TG5). Kept in sync automatically once matched via MightPulse.">
                <input id="m-tc" type="number" min="0" max="60" className="input" value={form.town_center} onChange={(e) => setForm({ ...form, town_center: e.target.value })} />
              </Field>
            </div>
            <Field label="Public bio" id="m-bio">
              <textarea id="m-bio" className="textarea" value={form.bio} maxLength={300} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>
            <Field label="Profile photo" id="m-photo" hint="Square JPG, PNG or WebP up to 1 MB. Shown on the member profile, leaderboard and calendar.">
              <div className="flex items-center gap-2 wrap">
                <Avatar src={form.photoPreview || (form.avatar ? form.avatar : null)} name={form.name} size={46} />
                <label className="btn btn-ghost btn-sm" htmlFor="m-photo-file">Upload photo</label>
                <input id="m-photo-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoPick} style={{ display: 'none' }} aria-label="Choose profile photo" />
                {form.avatar || form.photoFile ? (
                  <button type="button" className="btn btn-danger btn-sm" onClick={clearPhoto}>Remove photo</button>
                ) : null}
              </div>
            </Field>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {reviewOpen ? (
        <Modal
          title="Review MightPulse changes"
          onClose={() => setReviewOpen(false)}
          wide
          footer={<Button variant="ghost" onClick={() => setReviewOpen(false)}>Close</Button>}
        >
          {pendingCount > 0 ? (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <h3 style={{ margin: 0, fontSize: 15 }}>New members found ({pendingCount})</h3>
                <Button size="sm" loading={reviewBusy} onClick={approveAll}>Add all {pendingCount}</Button>
              </div>
              <div className="mp-review-list">
                {review.pending.map((p) => (
                  <div className="mp-review-row" key={p.id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.nick_name}</div>
                      <div className="text-dim" style={{ fontSize: 12 }}>
                        ID {p.governor_id} · {p.alliance_rank || 'R1'} · Power {num(p.power)} · TC {formatTownCenter(p.town_center) || '—'}
                      </div>
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-gold btn-sm" disabled={reviewBusy} onClick={() => approveOne(p.id)} title="Add to roster"><IconCheck size={14} /> Add</button>
                      <button className="btn btn-ghost btn-sm" disabled={reviewBusy} onClick={() => ignoreOne(p.id)} title="Ignore"><IconClose size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {missingCount > 0 ? (
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Possibly left the alliance ({missingCount})</h3>
              <div className="mp-review-list">
                {review.missing.map((m) => (
                  <div className="mp-review-row" key={m.id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div className="text-dim" style={{ fontSize: 12 }}>ID {m.game_user_id} · no longer seen in the in-game roster</div>
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" disabled={reviewBusy} onClick={() => dismissMissing(m.id)} title="Still here — clear this flag">Still here</button>
                      <button className="btn btn-danger btn-sm" disabled={reviewBusy} onClick={() => { setReviewOpen(false); setConfirm(m); }} title="Remove from roster"><IconTrash size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {reviewCount === 0 ? <p className="text-dim">Nothing to review.</p> : null}
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Remove member?"
          message={`${confirm.name} (ID ${confirm.game_user_id}) will immediately lose access. Their redemptions are also removed.`}
          confirmLabel="Remove member"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
