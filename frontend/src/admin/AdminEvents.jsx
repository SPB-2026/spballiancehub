import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconCheck } from '../components/icons.jsx';

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v) {
  // Interpret the value as UTC (alliance events are scheduled in UTC)
  return new Date(`${v}:00Z`).toISOString();
}

const CATEGORIES = ['war', 'tournament', 'social', 'maintenance', 'other'];

export default function AdminEvents() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/events'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  function emptyForm() {
    return { title: '', description: '', category: 'tournament', starts_at: '', ends_at: '', location: '', image: '', priority: 0, published: true };
  }

  function openNew() { setForm(emptyForm()); setFormError(''); setEditing('new'); }
  function openEdit(e) {
    setForm({
      title: e.title, description: e.description, category: e.category, location: e.location || '',
      starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at),
      image: e.image || '', priority: e.priority || 0, published: Boolean(e.published),
    });
    setFormError('');
    setEditing(e);
  }

  async function save(ev) {
    ev.preventDefault();
    if (!form.starts_at || !form.ends_at) { setFormError('Both start and end date/time are required.'); return; }
    setSaving(true);
    setFormError('');
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      starts_at: fromLocalInput(form.starts_at),
      ends_at: fromLocalInput(form.ends_at),
    };
    try {
      if (editing === 'new') {
        await api.post('/admin/events', payload);
        toast.success('Event created', `${form.title} is on the calendar.`);
      } else {
        await api.put(`/admin/events/${editing.id}`, payload);
        toast.success('Event updated', `${form.title} was saved.`);
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(e) {
    try {
      await api.put(`/admin/events/${e.id}`, { published: !e.published });
      toast.success(e.published ? 'Hidden from members' : 'Published to members', e.title);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function doRemove(e) {
    setBusy(true);
    try {
      await api.del(`/admin/events/${e.id}`);
      toast.info('Event deleted', e.title);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'title', label: 'Event', render: (e) => (
      <div className="flex items-center gap-1">
        {e.image ? <img src={e.image} alt="" style={{ width: 44, height: 26, objectFit: 'cover', borderRadius: 5 }} /> : <span style={{ width: 44, height: 26 }} className="skeleton" />}
        <div>
          <div style={{ fontWeight: 600 }}>{e.title}</div>
          <div className="text-dim" style={{ fontSize: 11.5 }}>{e.description ? e.description.slice(0, 60) : ''}</div>
        </div>
      </div>
    ) },
    { key: 'category', label: 'Category', render: (e) => <Badge kind="gray">{e.category}</Badge> },
    {
      key: 'starts', label: 'Starts (UTC)', render: (e) => (
        <span className="mono" style={{ fontSize: 12.5 }}>{fmtDate(e.starts_at)} {fmtTime(e.starts_at)}</span>
      ),
    },
    {
      key: 'ends', label: 'Ends (UTC)', render: (e) => (
        <span className="mono" style={{ fontSize: 12.5 }}>{fmtDate(e.ends_at)} {fmtTime(e.ends_at)}</span>
      ),
    },
    { key: 'location', label: 'Location', render: (e) => e.location || '—' },
    { key: 'priority', label: 'Priority', align: 'right', render: (e) => <span className="mono">{e.priority || 0}</span> },
    { key: 'status', label: 'Status', render: (e) => (
      <Badge kind={e.status === 'ongoing' ? 'green' : e.status === 'completed' ? 'gray' : 'blue'} dot>{e.status}</Badge>
    ) },
    {
      key: 'published', label: 'Visible', render: (e) => (
        <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(e)} title={e.published ? 'Hide from members' : 'Show to members'}>
          {e.published ? <><IconCheck size={13} /> Listed</> : 'Hidden'}
        </button>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (e) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)} title="Edit event"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(e)} title="Delete event"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Events &amp; <span className="text-gold">Calendar</span></h1>
          <p>Create and manage every alliance event. Status (upcoming / ongoing / completed) is computed from the times automatically.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>New event</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🗓️"
        emptyTitle="No events scheduled"
        emptyText="Create the first event to populate the member calendar."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Create Event' : `Edit ${editing.title}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Create event' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Event name" id="ev-title">
              <input id="ev-title" className="input" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <div className="settings-form">
              <Field label="Start date & time (UTC)" id="ev-start" hint="Times are stored in UTC and shown to members converted to their browser time.">
                <input id="ev-start" type="datetime-local" className="input" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required />
              </Field>
              <Field label="End date & time (UTC)" id="ev-end">
                <input id="ev-end" type="datetime-local" className="input" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} required />
              </Field>
              <Field label="Category" id="ev-cat">
                <select id="ev-cat" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Location" id="ev-loc">
                <input id="ev-loc" className="input" value={form.location} maxLength={120} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. East Keep" />
              </Field>
            </div>
            <div className="settings-form">
              <Field label="Priority" id="ev-priority" hint="Higher events sort first on the member events page.">
                <input id="ev-priority" type="number" min="0" max="99" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </Field>
            </div>
            <Field label="Event image" id="ev-image" hint="Shown as a thumbnail on the member events page and calendar.">
              <MediaPicker initial={form.image} onPick={(url) => setForm({ ...form, image: url })} label="Choose image" />
            </Field>
            <Field label="Description" id="ev-desc">
              <textarea id="ev-desc" className="textarea" value={form.description} maxLength={2000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published (hidden until checked; unpublished events appear here only)
            </label>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Delete event?"
          message={`“${confirm.title}” will be removed from the member calendar and events page.`}
          confirmLabel="Delete event"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
