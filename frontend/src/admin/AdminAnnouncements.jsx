import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconCheck } from '../components/icons.jsx';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v) {
  return v ? new Date(`${v}:00Z`).toISOString() : null;
}

export default function AdminAnnouncements() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/announcements'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  function emptyForm() {
    return { title: '', body: '', priority: 0, published: true, expires_at: '' };
  }

  function openNew() { setForm(emptyForm()); setFormError(''); setEditing('new'); }
  function openEdit(a) {
    setForm({ title: a.title, body: a.body, priority: a.priority, published: Boolean(a.published), expires_at: toLocalInput(a.expires_at) });
    setFormError('');
    setEditing(a);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { ...form, priority: Number(form.priority) || 0, expires_at: fromLocalInput(form.expires_at) };
    try {
      if (editing === 'new') {
        await api.post('/admin/announcements', payload);
        toast.success('Announcement created', payload.published ? 'It is live on the Home page now.' : 'Saved as draft.');
      } else {
        await api.put(`/admin/announcements/${editing.id}`, payload);
        toast.success('Announcement updated', form.title);
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(a) {
    try {
      await api.put(`/admin/announcements/${a.id}`, { published: !a.published });
      toast.success(a.published ? 'Unpublished' : 'Published', a.title);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function doRemove(a) {
    setBusy(true);
    try {
      await api.del(`/admin/announcements/${a.id}`);
      toast.info('Announcement deleted', a.title);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items || [];

  const statusOf = (a) => {
    if (!a.published) return { kind: 'gray', label: 'Draft' };
    if (a.expires_at && Date.parse(a.expires_at) < Date.now()) return { kind: 'red', label: 'Expired' };
    return { kind: 'green', label: 'Live' };
  };

  const columns = [
    { key: 'title', label: 'Announcement', render: (a) => (
      <div>
        <div style={{ fontWeight: 600 }}>{a.title}</div>
        <div className="text-dim" style={{ fontSize: 11.5 }}>{a.body ? a.body.slice(0, 70) : ''}</div>
      </div>
    ) },
    { key: 'priority', label: 'Priority', render: (a) => <Badge kind={a.priority > 0 ? 'gold' : 'gray'}>{a.priority}</Badge> },
    { key: 'status', label: 'Status', render: (a) => {
      const st = statusOf(a);
      return <Badge kind={st.kind} dot={st.kind === 'green'}>{st.label}</Badge>;
    } },
    { key: 'expires_at', label: 'Expires (UTC)', render: (a) => <span className="mono" style={{ fontSize: 12.5 }}>{a.expires_at ? fmtDate(a.expires_at) : 'Never'}</span> },
    {
      key: 'published', label: '', render: (a) => (
        <button className="btn btn-sm" variant={a.published ? 'ghost' : 'outline'} onClick={() => togglePublish(a)}>
          {a.published ? <><IconCheck size={13} /> Published</> : 'Unpublished'}
        </button>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (a) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} title="Edit announcement"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(a)} title="Delete announcement"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Announcements <span className="text-gold">Board</span></h1>
          <p>Up to the top 3 live announcements are shown to members on the Home page, highest priority first. {data?.active ?? '…'} currently live.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>New announcement</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={items}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="📣"
        emptyTitle="No announcements"
        emptyText="Create an announcement to pin it to the member Home page."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'New Announcement' : `Edit ${editing.title}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Create announcement' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Title" id="a-title" hint="Short headline, e.g. “East Keep war this week”.">
              <input id="a-title" className="input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Message" id="a-body">
              <textarea id="a-body" className="textarea" style={{ minHeight: 80 }} value={form.body} maxLength={500} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <div className="settings-form">
              <Field label="Priority" id="a-prio" hint="Higher numbers appear first on the Home board.">
                <input id="a-prio" type="number" min={-100} max={100} className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </Field>
              <Field label="Expiration (UTC)" id="a-exp" hint="Leave empty for a permanent announcement.">
                <input id="a-exp" type="datetime-local" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </Field>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published (visible to members immediately)
            </label>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Delete announcement?"
          message={`“${confirm.title}” will be removed from the member Home page. This cannot be undone.`}
          confirmLabel="Delete announcement"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
