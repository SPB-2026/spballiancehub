import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, Modal, Field, ConfirmDialog } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';
import { IconPlus, IconEdit, IconTrash } from '../components/icons.jsx';

const EMPTY = { username: '', email: '', name: '', password: '' };

export default function AdminAdmins() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/admins'), []);
  const [editing, setEditing] = useState(null); // null | 'new' | admin
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  function openNew() { setForm(EMPTY); setFormError(''); setEditing('new'); }
  function openEdit(a) {
    setForm({ username: a.username, email: a.email, name: a.name, password: '' });
    setFormError('');
    setEditing(a);
  }

  function validate() {
    if (!form.username.trim()) return 'Username is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (!form.name.trim()) return 'Name is required.';
    if (editing === 'new' && form.password.length < 8) return 'Password must be at least 8 characters.';
    if (editing !== 'new' && form.password && form.password.length < 8) return 'New password must be at least 8 characters.';
    return '';
  }

  async function save(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await api.post('/admin/admins', form);
        toast.success('Admin added', `${form.name} can now sign in to the admin panel.`);
      } else {
        const payload = { username: form.username, email: form.email, name: form.name };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/admins/${editing.id}`, payload);
        toast.success('Admin updated', `${form.name}'s account was saved${form.password ? ' — password reset' : ''}.`);
      }
      setEditing(null);
      reload();
    } catch (err2) {
      setFormError(err2.message);
    } finally {
      setSaving(false);
    }
  }

  async function doRemove(a) {
    setBusy(true);
    try {
      await api.del(`/admin/admins/${a.id}`);
      toast.info('Admin removed', `${a.name} no longer has admin access.`);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Remove failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'admin', label: 'Admin', render: (a) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {a.name}
            {a.id === user?.id ? <span style={{ marginLeft: 8 }}><Badge kind="gold">You</Badge></span> : null}
          </div>
          <div className="text-dim" style={{ fontSize: 11.5 }}>@{a.username}</div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'created_at', label: 'Created', render: (a) => <span className="mono" style={{ fontSize: 12.5 }}>{fmtDateTime(a.created_at)}</span> },
    {
      key: 'actions', label: '', align: 'right', render: (a) => (
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} title="Edit admin"><IconEdit /></button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirm(a)}
            disabled={a.id === user?.id}
            title={a.id === user?.id ? 'You cannot remove your own account' : 'Remove admin'}
          >
            <IconTrash />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Admin <span className="text-gold">Accounts</span></h1>
          <p>Control who can sign in to the admin panel. Passwords are stored hashed; sessions are audited in the Activity Log.</p>
        </div>
        <Button icon={<IconPlus />} onClick={openNew}>Add admin</Button>
      </div>

      <AdminTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🛡️"
        emptyTitle="No admin accounts"
        emptyText="Add an admin account to give another officer command access."
      />

      {editing ? (
        <Modal
          title={editing === 'new' ? 'Add Admin' : `Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button loading={saving} onClick={save}>{editing === 'new' ? 'Add admin' : 'Save changes'}</Button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="settings-form">
              <Field label="Username" id="a-username" hint="Lowercase, no spaces.">
                <input id="a-username" className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required maxLength={40} />
              </Field>
              <Field label="Email" id="a-email">
                <input id="a-email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={160} />
              </Field>
              <Field label="Name" id="a-name" hint="Shown in the audit trail and admin menu.">
                <input id="a-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={40} />
              </Field>
              <Field
                label={editing === 'new' ? 'Password' : 'New password'}
                id="a-pass"
                hint={editing === 'new' ? 'At least 8 characters.' : 'Leave blank to keep the current password.'}
              >
                <input id="a-pass" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} maxLength={128} autoComplete="new-password" required={editing === 'new'} />
              </Field>
            </div>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title="Remove admin?"
          message={`${confirm.name} (@${confirm.username}) will immediately lose admin access.`}
          confirmLabel="Remove admin"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
