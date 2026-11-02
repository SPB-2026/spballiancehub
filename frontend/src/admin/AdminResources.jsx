import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { IconPlus, IconEdit, IconTrash } from '../components/icons.jsx';

const EMPTY = { title: '', url: '', description: '', category: '', sort_order: 0, published: true };

export default function AdminResources() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/resources'), []);
  const [editing, setEditing] = useState(null); // null | 'new' | link
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data || [];
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];

  function openNew() {
    const nextOrder = rows.reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), 0) + 10;
    setForm({ ...EMPTY, sort_order: nextOrder });
    setFormError('');
    setEditing('new');
  }

  function openEdit(r) {
    setForm({
      title: r.title, url: r.url, description: r.description || '',
      category: r.category || '', sort_order: r.sort_order, published: Boolean(r.published),
    });
    setFormError('');
    setEditing(r);
  }

  async function save(e) {
    e?.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editing === 'new') {
        await api.post('/admin/resources', form);
        toast.success('Link added', form.title);
      } else {
        await api.put(`/admin/resources/${editing.id}`, form);
        toast.success('Link updated', form.title);
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api.del(`/admin/resources/${confirm.id}`);
      toast.success('Link deleted', confirm.title);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Could not delete', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'title', label: 'Link', render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.title}</div>
          <div className="text-dim mono" style={{ fontSize: 11.5 }}>{r.url}</div>
        </div>
      ),
    },
    { key: 'category', label: 'Group', render: (r) => r.category || '—' },
    { key: 'sort_order', label: 'Order', align: 'right', render: (r) => <span className="mono">{r.sort_order}</span> },
    {
      key: 'published', label: 'Status', render: (r) => (
        <Badge kind={r.published ? 'green' : 'gray'}>{r.published ? 'Visible' : 'Hidden'}</Badge>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (r) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} title="Edit link"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(r)} title="Delete link"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Useful <span className="text-gold">Resources</span></h1>
          <p>Links to outside sites, shown to members on the Resources page and grouped by their group name.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>Add link</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🔗"
        emptyTitle="No links yet"
        emptyText="Add the first useful site for your members."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add a link' : `Edit ${editing.title}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>Save</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Name" id="r-title">
              <input id="r-title" className="input" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Website address" id="r-url" hint="Must start with https:// (or http://).">
              <input id="r-url" className="input" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
            </Field>
            <Field label="Short description" id="r-desc" hint="One or two lines on what members will find there.">
              <textarea id="r-desc" className="textarea" style={{ minHeight: 80 }} value={form.description} maxLength={240} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Group" id="r-cat" hint="Links with the same group name are shown together.">
              <input id="r-cat" className="input" list="r-cat-list" value={form.category} maxLength={40} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="r-cat-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Order" id="r-order" hint="Lower numbers show first.">
              <input id="r-order" className="input" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </Field>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Visible to members
            </label>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Delete this link?"
          message={`“${confirm.title}” will be removed from the Resources page.`}
          confirmLabel="Delete"
          danger
          loading={busy}
          onConfirm={doDelete}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
