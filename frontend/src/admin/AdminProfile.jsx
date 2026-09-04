import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { Button, Field, Badge } from '../components/ui.jsx';

export default function AdminProfile() {
  const { refresh, logout } = useAuth();
  const toast = useToast();
  const { data: admins, loading } = useAsync(() => api.get('/admin/admins'), []);
  const me = (admins || [])[0] || null;
  const [form, setForm] = useState({ name: '', email: '', username: '' });
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initialized = useRef(false);

  // Fill in the full record (email etc.) exactly once when it arrives — never
  // overwrite what the admin has already typed.
  useEffect(() => {
    if (me && !initialized.current) {
      initialized.current = true;
      setForm((f) => ({ ...f, name: me.name, email: me.email, username: me.username }));
    }
  }, [me]);

  async function save(e) {
    e.preventDefault();
    if (!me) { setError('No admin account found.'); return; }
    if (password && password.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setSaving(true);
    setError('');
    const payload = { name: form.name, email: form.email, username: form.username };
    if (password) payload.password = password;
    try {
      await api.put(`/admin/admins/${me.id}`, payload);
      await refresh();
      setPassword('');
      toast.success('Profile updated', password ? 'Your password was changed.' : 'Your details were saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    window.location.replace('/');
  }

  if (loading) return null;
  if (!me) return <div className="page"><div className="state-box"><h3>No admin account</h3><p>No admin found.</p></div></div>;

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Admin <span className="text-gold">Profile</span></h1>
          <p>Admin account. Changes apply immediately.</p>
        </div>
        <Badge kind="gold">{me.username}</Badge>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card card-gold card-pad" onSubmit={save}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Account Details</h2>
          <Field label="Name" id="p-name" hint="Shown in the admin menu and the activity log.">
            <input id="p-name" className="input" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="settings-form">
            <Field label="Username" id="p-user">
              <input id="p-user" className="input" value={form.username} maxLength={40} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required />
            </Field>
            <Field label="Email" id="p-email">
              <input id="p-email" type="email" className="input" value={form.email} maxLength={160} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
          </div>
          <Field label="New password" id="p-pass" hint="Leave blank to keep your current password. Minimum 8 characters.">
            <input id="p-pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={128} />
          </Field>
          {error ? <div className="form-error">{error}</div> : null}
          <div className="mt-2">
            <Button type="submit" loading={saving}>Save profile</Button>
          </div>
        </form>

        <div className="card card-pad">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Session</h2>
          <p className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
            Signing out ends this admin session immediately. Member sessions are not affected.
          </p>
          <Button variant="outline" onClick={signOut}>Log out of admin</Button>
        </div>
      </div>
    </div>
  );
}
