import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDate, asTagArray, tagsToCsv } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconCheck } from '../components/icons.jsx';

const CATEGORIES = ['general', 'heroes', 'city', 'resources', 'combat', 'alliance', 'events', 'formations', 'equipment', 'f2p'];
const LABELS = {
  general: 'General Tips',
  heroes: 'Heroes & Troops',
  city: 'City Development',
  resources: 'Resources',
  combat: 'Combat & PvP',
  alliance: 'Alliance Strategy',
  events: 'Events',
  formations: 'Formations & Marches',
  equipment: 'Equipment & Upgrades',
  f2p: 'F2P & Spending',
};

export default function AdminTips() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/articles'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  function emptyForm() {
    return { title: '', category: 'general', body: '', tags: '', published: true, cover: '' };
  }

  function openNew() { setForm(emptyForm()); setFormError(''); setEditing('new'); }
  function openEdit(a) {
    setForm({ title: a.title, category: a.category, body: a.body, tags: tagsToCsv(a.tags), published: Boolean(a.published), cover: a.cover || '' });
    setFormError('');
    setEditing(a);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await api.post('/admin/articles', form);
        toast.success('Tip published', form.title);
      } else {
        await api.put(`/admin/articles/${editing.id}`, form);
        toast.success('Tip updated', form.published ? 'Article is live.' : 'Article unpublished.');
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
      await api.put(`/admin/articles/${a.id}`, { published: !a.published });
      toast.success(a.published ? 'Unpublished' : 'Published', a.title);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function doRemove(a) {
    setBusy(true);
    try {
      await api.del(`/admin/articles/${a.id}`);
      toast.info('Tip deleted', a.title);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items || [];

  const columns = [
    { key: 'title', label: 'Article', render: (a) => (
      <div className="flex items-center gap-1">
        {a.cover ? <img src={a.cover} alt="" style={{ width: 44, height: 26, objectFit: 'cover', borderRadius: 5 }} /> : <span style={{ width: 44, height: 26 }} className="skeleton" />}
        <div>
          <div style={{ fontWeight: 600 }}>{a.title}</div>
          <div className="text-dim" style={{ fontSize: 11.5 }}>{asTagArray(a.tags).slice(0, 3).map((t) => `#${t}`).join(' ')}</div>
        </div>
      </div>
    ) },
    { key: 'category', label: 'Category', render: (a) => <Badge kind="blue">{LABELS[a.category] || a.category}</Badge> },
    {
      key: 'published', label: 'Status', render: (a) => (
        <button className="btn btn-sm" variant={a.published ? 'ghost' : 'outline'} onClick={() => togglePublish(a)}>
          {a.published ? <><IconCheck size={13} /> Published</> : 'Unpublished'}
        </button>
      ),
    },
    { key: 'published_at', label: 'Published', render: (a) => <span className="mono" style={{ fontSize: 12.5 }}>{fmtDate(a.published_at || a.created_at)}</span> },
    {
      key: 'actions', label: '', align: 'right', render: (a) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} title="Edit tip"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(a)} title="Delete tip"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Tips &amp; Tricks <span className="text-gold">Management</span></h1>
          <p>Curate the alliance knowledge base across all ten strategy categories.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>New tip</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={items}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="📖"
        emptyTitle="No tips yet"
        emptyText="Add the first strategy guide for the alliance."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Create Tip' : `Edit ${editing.title}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Save tip' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Title" id="t-title">
              <input id="t-title" className="input" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <div className="settings-form">
              <Field label="Category" id="t-cat">
                <select id="t-cat" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Tags" id="t-tags" hint="Comma-separated, e.g. war, shields">
                <input id="t-tags" className="input" value={form.tags} maxLength={120} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </Field>
            </div>
            <Field label="Cover image" id="t-cover" hint="Shown on the tip card in the Tips & Tricks section.">
              <MediaPicker initial={form.cover} onPick={(url) => setForm({ ...form, cover: url })} label="Choose cover" />
            </Field>
            <Field label="Content" id="t-body" hint="Separate paragraphs with a blank line.">
              <textarea id="t-body" className="textarea" style={{ minHeight: 220 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </Field>
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
          title="Delete tip?"
          message={`“${confirm.title}” will be permanently deleted.`}
          confirmLabel="Delete tip"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
