import React, { useRef, useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash, IconImage, IconCheck } from '../components/icons.jsx';

const CATEGORIES = ['alliance', 'war', 'tournament', 'update', 'announcement', 'community'];

export default function AdminNews() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/news'), []);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const coverRef = useRef(null);

  function emptyForm() {
    return { title: '', category: 'alliance', cover: '', summary: '', body: '', published: true, author: '', featured: false };
  }

  function openNew() { setForm(emptyForm()); setFormError(''); setEditing('new'); }
  function openEdit(n) {
    setForm({
      title: n.title, category: n.category, cover: n.cover || '', summary: n.summary, body: n.body,
      published: Boolean(n.published), author: n.author, featured: Boolean(n.featured),
    });
    setFormError('');
    setEditing(n);
  }

  async function uploadCover() {
    const file = coverRef.current?.files?.[0];
    if (!file) return;
    try {
      const { cover } = await api.upload('/admin/news/cover', file, 'cover');
      setForm((f) => ({ ...f, cover }));
      toast.success('Cover uploaded');
    } catch (err) {
      toast.error('Cover upload failed', err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await api.post('/admin/news', form);
        toast.success('News published', form.title);
      } else {
        await api.put(`/admin/news/${editing.id}`, form);
        toast.success('News updated', form.published ? 'Article is live.' : 'Article unpublished.');
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(n) {
    try {
      await api.put(`/admin/news/${n.id}`, { published: !n.published });
      toast.success(n.published ? 'Unpublished' : 'Published', n.title);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function toggleFeatured(n) {
    try {
      await api.put(`/admin/news/${n.id}`, { featured: !n.featured });
      toast.success(n.featured ? 'Featured removed' : 'Marked as featured', n.title);
      reload();
    } catch (err) {
      toast.error('Action failed', err.message);
    }
  }

  async function doRemove(n) {
    setBusy(true);
    try {
      await api.del(`/admin/news/${n.id}`);
      toast.info('News deleted', n.title);
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
    { key: 'title', label: 'Article', render: (n) => (
      <div className="flex items-center gap-1">
        {n.cover ? <img src={n.cover} alt="" style={{ width: 44, height: 26, objectFit: 'cover', borderRadius: 5 }} /> : <span style={{ width: 44, height: 26 }} className="skeleton" />}
        <div>
          <div style={{ fontWeight: 600 }}>{n.title}</div>
          <div className="text-dim" style={{ fontSize: 11.5 }}>{n.author} · {fmtDate(n.published_at || n.created_at)}</div>
        </div>
      </div>
    ) },
    { key: 'category', label: 'Category', render: (n) => <Badge kind="gray">{n.category}</Badge> },
    {
      key: 'featured', label: 'Featured', render: (n) => (
        <button className="btn btn-ghost btn-sm" onClick={() => toggleFeatured(n)} title={n.featured ? 'Remove featured badge' : 'Mark as featured (shown on Home)'}>
          <span style={{ color: n.featured ? 'var(--gold-bright)' : 'var(--text-3)' }}>★</span>{' '}
          {n.featured ? 'Featured' : '—'}
        </button>
      ),
    },
    {
      key: 'published', label: 'Status', render: (n) => (
        <button className="btn btn-sm" variant={n.published ? 'ghost' : 'outline'} onClick={() => togglePublish(n)}>
          {n.published ? <><IconCheck size={13} /> Published</> : 'Unpublished'}
        </button>
      ),
    },
    {
      key: 'actions', label: '', align: 'right', render: (n) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(n)} title="Edit article"><IconEdit size={14} /></button>
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(n)} title="Delete article"><IconTrash size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>News <span className="text-gold">Management</span></h1>
          <p>Published articles appear on the Home page and the News section instantly.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>New article</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={items}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="📜"
        emptyTitle="No articles yet"
        emptyText="Write the first dispatch for the alliance."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Create News Article' : `Edit ${editing.title}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Save article' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <Field label="Title" id="n-title">
              <input id="n-title" className="input" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <div className="settings-form">
              <Field label="Category" id="n-cat">
                <select id="n-cat" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Author" id="n-author">
                <input id="n-author" className="input" value={form.author} maxLength={80} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="SPB Command" />
              </Field>
            </div>

            <div className="field">
              <label id="n-cover-label">Cover image</label>
              <div className="logo-preview">
                {form.cover ? <img src={form.cover} alt="Cover preview" /> : <span className="logo-default skeleton" />}
                <div style={{ flex: 1 }}>
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={uploadCover}
                    aria-labelledby="n-cover-label"
                    style={{ fontSize: 13, color: 'var(--text-2)' }}
                  />
                  <div className="hint mt-1">JPG, PNG or WebP · max 2 MB</div>
                  {form.cover ? (
                    <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setForm({ ...form, cover: '' })}>Remove cover</button>
                  ) : null}
                </div>
              </div>
            </div>

            <Field label="Summary" id="n-summary" hint="Short description shown on the news card.">
              <textarea id="n-summary" className="textarea" style={{ minHeight: 70 }} value={form.summary} maxLength={400} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </Field>
            <Field label="Full article" id="n-body" hint="Separate paragraphs with a blank line.">
              <textarea id="n-body" className="textarea" style={{ minHeight: 220 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </Field>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published (visible to members immediately)
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              ★ Featured (highlighted on the Home page)
            </label>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Delete article?"
          message={`“${confirm.title}” will be permanently deleted.`}
          confirmLabel="Delete article"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
