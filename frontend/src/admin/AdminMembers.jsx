import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { num, fmtDate } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconBolt, IconSearch } from '../components/icons.jsx';

const EMPTY = {
  game_user_id: '', email: '', name: '', role: 'R1', status: 'active',
  bio: '', contributions: 0, score: 0, join_date: new Date().toISOString().slice(0, 10),
  avatar: '', photoFile: null, photoPreview: null,
};

const ROLE_BADGE = { R5: 'gold', R4: 'gold', R3: 'blue', R2: 'gray', R1: 'gray' };

export default function AdminMembers() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/members'), []);
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
      bio: m.bio || '', contributions: m.contributions, score: m.score, join_date: m.join_date,
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
        toast.success('Member added', `${form.name} can now sign in with their Game User ID and email.`);
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

  const columns = [
    {
      key: 'member', label: 'Member', render: (m) => (
        <div className="flex items-center gap-1">
          <Avatar src={m.avatar} name={m.name} size={30} />
          <div>
            <div style={{ fontWeight: 600 }}>{m.name}</div>
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
          <Button icon={<IconPlus />} onClick={openNew}>Add member</Button>
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={filtered}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🛡️"
        emptyTitle={query ? 'No members match your search' : 'No members yet'}
        emptyText={query ? `Nothing found for “${query}”.` : 'Add your first member with their Game User ID and email.'}
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
              <Field label="Email" id="m-email">
                <input id="m-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={160} />
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
