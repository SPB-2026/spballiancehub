import React, { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { Button, Field, Badge } from '../components/ui.jsx';
import Emblem from '../components/Emblem.jsx';
import MediaPicker from '../components/MediaPicker.jsx';

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'];

export default function AdminSettings() {
  const { settings, refresh } = useAuth();
  const toast = useToast();
  const logoRef = useRef(null);
  const [form, setForm] = useState({
    alliance_name: settings?.alliance_name || '',
    tagline: settings?.tagline || '',
    alliance_rank: settings?.alliance_rank || '',
    announcement: settings?.announcement || '',
    timezone: settings?.timezone || 'UTC',
    description: settings?.description || '',
    contact_email: settings?.contact_email || '',
    footer_text: settings?.footer_text || '',
    maintenance: Boolean(settings?.maintenance),
    favicon: settings?.favicon || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, maintenance: form.maintenance ? 1 : 0 };
      await api.put('/admin/settings', payload);
      await refresh();
      toast.success('Settings saved', 'Website settings were updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo() {
    const file = logoRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.upload('/admin/settings/logo', file, 'logo');
      await refresh();
      toast.success('Logo updated', 'The new emblem is now displayed.');
    } catch (err) {
      toast.error('Logo upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Website <span className="text-gold">Settings</span></h1>
          <p>Centralized configuration for the whole hub. Changes apply to every member immediately.</p>
        </div>
        <Badge kind="gold">Admin</Badge>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card card-gold card-pad" onSubmit={save}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Alliance Identity</h2>
          <Field label="Alliance name" id="set-name">
            <input id="set-name" className="input" value={form.alliance_name} maxLength={60} onChange={(e) => setForm({ ...form, alliance_name: e.target.value })} required />
          </Field>
          <Field label="Tagline" id="set-tag">
            <input id="set-tag" className="input" value={form.tagline} maxLength={120} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </Field>
          <Field label="Alliance rank (displayed on Home)" id="set-rank" hint="e.g. Season 4 · Top 20%">
            <input id="set-rank" className="input" value={form.alliance_rank} maxLength={60} onChange={(e) => setForm({ ...form, alliance_rank: e.target.value })} />
          </Field>
          <Field label="Timezone preference" id="set-tz" hint="Reference timezone shown to members for event planning.">
            <select id="set-tz" className="select" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Website announcement" id="set-ann" hint="Legacy banner on the Home page. Prefer the Announcements section for scheduled, prioritized notices.">
            <textarea id="set-ann" className="textarea" style={{ minHeight: 70 }} value={form.announcement} maxLength={300} onChange={(e) => setForm({ ...form, announcement: e.target.value })} />
          </Field>

          <hr className="card-divider" />
          <h2 style={{ fontSize: 17, marginTop: 18, marginBottom: 14 }}>Site Information</h2>
          <Field label="Website description" id="set-desc" hint="Used in the page meta description (SEO).">
            <textarea id="set-desc" className="textarea" style={{ minHeight: 64 }} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Contact email" id="set-contact" hint="Shown in the footer as the alliance contact address.">
            <input id="set-contact" type="email" className="input" value={form.contact_email} maxLength={160} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </Field>
          <Field label="Footer text" id="set-footer" hint="Replaces the default footer line. Leave empty for the default.">
            <textarea id="set-footer" className="textarea" style={{ minHeight: 64 }} value={form.footer_text} maxLength={200} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
          </Field>

          <hr className="card-divider" />
          <h2 style={{ fontSize: 17, marginTop: 18, marginBottom: 14 }}>Maintenance</h2>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 10 }}>
            While enabled, the member-facing site shows a maintenance notice and members cannot
            browse content. Logged-in admins are not affected and can still sign in.
          </p>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.maintenance} onChange={(e) => setForm({ ...form, maintenance: e.target.checked })} />
            Enable maintenance mode
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="mt-2">
            <Button type="submit" loading={saving}>Save settings</Button>
          </div>
        </form>

        <div className="card card-gold card-pad">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Alliance Logo</h2>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 14 }}>
            Square emblem (JPG, PNG or WebP, max 2 MB). If empty, the built-in SPB crest is used.
          </p>
          <div className="logo-preview">
            {settings?.logo ? (
              <img src={settings.logo} alt="Current alliance logo" />
            ) : (
              <Emblem size={54} className="logo-default" />
            )}
            <div style={{ flex: 1 }}>
              <input
                ref={logoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadLogo}
                aria-label="Upload alliance logo"
                style={{ fontSize: 13, color: 'var(--text-2)' }}
              />
              <div className="hint mt-1">Upload a new logo</div>
            </div>
          </div>
          <div className="mt-2">
            <Button variant="outline" loading={uploading} onClick={uploadLogo}>Upload logo</Button>
          </div>

          <hr className="card-divider" />
          <h2 style={{ fontSize: 17, marginTop: 18, marginBottom: 14 }}>Favicon</h2>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 12 }}>
            The browser-tab icon. Square images work best. If empty, the built-in SPB crest is used.
          </p>
          <Field label="Favicon image" id="set-favicon" hint="Pick from the Media Library or upload a new icon.">
            <MediaPicker initial={form.favicon} onPick={(url) => setForm({ ...form, favicon: url })} label="Choose favicon" />
          </Field>
        </div>
      </div>
    </div>
  );
}
