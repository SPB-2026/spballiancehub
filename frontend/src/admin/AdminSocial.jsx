import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { Button, Field, Badge } from '../components/ui.jsx';
import { IconDiscord, IconYouTube } from '../components/icons.jsx';

export default function AdminSocial() {
  const { settings, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    discord_url: settings?.discord_url || '',
    youtube_url: settings?.youtube_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('/admin/settings', { discord_url: form.discord_url, youtube_url: form.youtube_url });
      await refresh();
      toast.success('Social links updated', 'Discord and YouTube buttons now point to your new URLs everywhere.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Social <span className="text-gold">Links</span></h1>
          <p>
            These URLs power the Discord and YouTube buttons in the header and footer for every member.
            Leave a field empty to hide its button.
          </p>
        </div>
      </div>

      <form className="card card-gold card-pad" onSubmit={save} style={{ maxWidth: 640 }}>
        <Field label="Discord URL" id="s-discord" hint="e.g. https://discord.gg/your-invite">
          <div className="flex items-center gap-1">
            <span className="stat-icon" style={{ width: 40, height: 40 }} aria-hidden="true"><IconDiscord /></span>
            <input id="s-discord" className="input" value={form.discord_url} onChange={(e) => setForm({ ...form, discord_url: e.target.value })} placeholder="https://discord.gg/…" />
          </div>
        </Field>
        <Field label="YouTube URL" id="s-youtube" hint="e.g. https://youtube.com/@your-channel">
          <div className="flex items-center gap-1">
            <span className="stat-icon" style={{ width: 40, height: 40 }} aria-hidden="true"><IconYouTube /></span>
            <input id="s-youtube" className="input" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtube.com/…" />
          </div>
        </Field>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="flex gap-2 wrap mt-2">
          <Button type="submit" loading={saving}>Save social links</Button>
          {form.discord_url ? <a className="btn btn-ghost" href={form.discord_url} target="_blank" rel="noopener noreferrer">Test Discord link</a> : null}
          {form.youtube_url ? <a className="btn btn-ghost" href={form.youtube_url} target="_blank" rel="noopener noreferrer">Test YouTube link</a> : null}
        </div>
      </form>
    </div>
  );
}
