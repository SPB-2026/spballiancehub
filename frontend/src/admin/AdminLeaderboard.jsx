import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState, Button, Badge, Modal, Field } from '../components/ui.jsx';
import { num, fmtDate } from '../utils/format.js';
import Avatar from '../components/Avatar.jsx';
import { IconEdit } from '../components/icons.jsx';

// Leaderboard management: the member-facing ranking is derived from member
// power — editing a member's power/name here changes the ranking instantly.
export default function AdminLeaderboard() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/members'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function emptyForm() {
    return { name: '', role: 'R1', status: 'active', score: 0, contributions: 0 };
  }

  function openEdit(m) {
    setForm({ name: m.name, role: m.role, status: m.status, score: m.score, contributions: m.contributions });
    setFormError('');
    setEditing(m);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.put(`/admin/members/${editing.id}`, { ...form, score: Number(form.score) || 0, contributions: Number(form.contributions) || 0 });
      toast.success('Leaderboard updated', `${form.name}'s entry was saved.`);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBox label="Ranking the alliance…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const ranked = [...(data || [])]
    .filter((m) => m.status !== 'banned')
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.contributions || 0) - (a.contributions || 0));
  const top = ranked.slice(0, 10);

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Leaderboard <span className="text-gold">Manager</span></h1>
          <p>Rankings are determined by power, then contributions. Edit a member's power to change their standing — the member-facing leaderboard updates instantly. Add or remove players from the Members page.</p>
        </div>
      </div>

      {top.length === 0 ? (
        <EmptyState icon="🏆" title="No players yet" emptyText="Add members with power to build the leaderboard." />
      ) : (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top.map((m, i) => (
            <div key={m.id} className="row-actions" style={{ justifyContent: 'flex-start', gap: 14, padding: '10px 6px', borderBottom: i < top.length - 1 ? '1px dashed rgba(168,179,194,0.12)' : 'none' }}>
              <span className={`lb-rank lb-rank-${i + 1}`} aria-label={`Rank ${i + 1}`}>{i + 1}</span>
              <Avatar src={m.avatar} name={m.name} size={34} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontWeight: 600 }}>
                  {m.name}
                  {m.status === 'inactive' ? <span style={{ marginLeft: 8 }}><Badge kind="gray">inactive</Badge></span> : null}
                </div>
                <div className="text-dim" style={{ fontSize: 11.5 }}>{m.role} · joined {fmtDate(m.join_date)}</div>
              </div>
              <div className="text-right" style={{ minWidth: 90 }}>
                <div className="mono text-gold" style={{ fontWeight: 700, fontSize: 16 }}>{num(m.score || 0)}</div>
                <div className="text-dim" style={{ fontSize: 10.5, letterSpacing: '0.1em' }}>POWER</div>
              </div>
              <div className="text-right" style={{ minWidth: 90 }}>
                <div className="mono" style={{ fontWeight: 600, fontSize: 14 }}>{num(m.contributions || 0)}</div>
                <div className="text-dim" style={{ fontSize: 10.5, letterSpacing: '0.1em' }}>CONTRIB</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)} title="Edit entry"><IconEdit size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <Modal
          title={`Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>Save entry</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Player name" id="lb-name">
              <input id="lb-name" className="input" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <div className="settings-form">
              <Field label="Power (points)" id="lb-score" hint="Determines the order within each rank.">
                <input id="lb-score" type="number" min="0" className="input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
              </Field>
              <Field label="Contributions" id="lb-contrib">
                <input id="lb-contrib" type="number" min="0" className="input" value={form.contributions} onChange={(e) => setForm({ ...form, contributions: e.target.value })} />
              </Field>
              <Field label="Role (rank)" id="lb-role">
                <select id="lb-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['R5', 'R4', 'R3', 'R2', 'R1'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Status" id="lb-status">
                <select id="lb-status" className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {['active', 'inactive', 'banned'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
