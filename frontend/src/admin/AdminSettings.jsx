import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import { Button, Field, Badge, ConfirmDialog } from '../components/ui.jsx';
import { IconRefresh, IconCopy } from '../components/icons.jsx';
import Emblem from '../components/Emblem.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';

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

  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    api.get('/admin/access-link')
      .then((r) => setLinkUrl(r.url))
      .catch(() => {})
      .finally(() => setLinkLoading(false));
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success('Copied', 'Link copied to your clipboard.');
    } catch {
      toast.error('Copy failed', 'Select and copy the link manually.');
    }
  }

  const [allianceRows, setAllianceRows] = useState([]);
  const [savingAlliance, setSavingAlliance] = useState(null);

  useEffect(() => {
    api.get('/admin/alliances').then(setAllianceRows).catch(() => {});
  }, []);

  function editAlliance(id, patch) {
    setAllianceRows((rows) => rows.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function saveAlliance(a) {
    setSavingAlliance(a.id);
    try {
      const saved = await api.put(`/admin/alliances/${a.id}`, {
        label: a.label, kingdom_id: a.kingdom_id, tag: a.tag, show_in_leaderboard: a.show_in_leaderboard,
      });
      editAlliance(a.id, saved);
      toast.success('Alliance saved', saved.label);
    } catch (err) {
      toast.error('Could not save alliance', err.message);
    } finally {
      setSavingAlliance(null);
    }
  }

  async function rotateLink() {
    setConfirmRotate(false);
    setRotating(true);
    try {
      const r = await api.post('/admin/access-link/rotate');
      setLinkUrl(r.url);
      toast.success('New link generated', 'Share it with your alliance — the old link no longer works for new entries.');
    } catch (err) {
      toast.error('Failed to generate a new link', err.message);
    } finally {
      setRotating(false);
    }
  }

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
            <RichTextEditor value={form.announcement} onChange={(html) => setForm((f) => ({ ...f, announcement: html }))} minHeight={70} maxLength={300} placeholder="Write the announcement…" />
          </Field>

          <hr className="card-divider" />
          <h2 style={{ fontSize: 17, marginTop: 18, marginBottom: 14 }}>Site Information</h2>
          <Field label="Website description" id="set-desc" hint="Used in the page meta description (SEO).">
            <textarea id="set-desc" className="textarea" style={{ minHeight: 64 }} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Contact email" id="set-contact" hint="Shown in the footer as the alliance contact address.">
            <input id="set-contact" type="email" className="input" value={form.contact_email} maxLength={160} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </Field>
          <Field label="Footer text" id="set-footer" hint="Replaces the default footer line. Leave empty for the default. Bold, italic and colored text are supported.">
            <RichTextEditor value={form.footer_text} onChange={(html) => setForm((f) => ({ ...f, footer_text: html }))} minHeight={64} maxLength={200} placeholder="Write the footer text…" />
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

        <div className="card card-gold card-pad">
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Member Access Link</h2>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 14 }}>
            Share this link with your alliance — it's how members get into the site. They click it
            once, enter their Game ID, and stay signed in after that. Anyone without this link
            can't get past the front page at all.
          </p>
          {linkLoading ? (
            <div className="skeleton" style={{ height: 42, borderRadius: 10 }} />
          ) : (
            <>
              <div className="flex items-center gap-1">
                <input className="input mono" style={{ flex: 1, fontSize: 13 }} readOnly value={linkUrl} onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" size="sm" icon={<IconCopy />} onClick={copyLink}>Copy</Button>
              </div>
              <div className="mt-2">
                <Button type="button" variant="ghost" size="sm" icon={<IconRefresh />} loading={rotating} onClick={() => setConfirmRotate(true)}>
                  Generate new link
                </Button>
              </div>
              <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>
                Members already signed in stay signed in — a new link only affects people trying to
                get in for the first time. Use this if the old link ever leaks.
              </p>
            </>
          )}
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Alliances</h2>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 14 }}>
            The rosters tracked on this site. Each one syncs from MightPulse using its kingdom and tag
            (two alliances can share a tag — the kingdom is what tells them apart).
          </p>
          {allianceRows.map((a) => (
            <div key={a.id} style={{ borderTop: '1px solid rgba(168, 179, 194, 0.14)', paddingTop: 12, marginTop: 12 }}>
              <Field label="Name" id={`al-label-${a.id}`}>
                <input id={`al-label-${a.id}`} className="input" value={a.label} maxLength={60} onChange={(e) => editAlliance(a.id, { label: e.target.value })} />
              </Field>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Kingdom" id={`al-kingdom-${a.id}`}>
                    <input id={`al-kingdom-${a.id}`} className="input" inputMode="numeric" value={a.kingdom_id} maxLength={6} onChange={(e) => editAlliance(a.id, { kingdom_id: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Tag" id={`al-tag-${a.id}`}>
                    <input id={`al-tag-${a.id}`} className="input" value={a.tag} maxLength={12} onChange={(e) => editAlliance(a.id, { tag: e.target.value })} />
                  </Field>
                </div>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" checked={Boolean(a.show_in_leaderboard)} onChange={(e) => editAlliance(a.id, { show_in_leaderboard: e.target.checked })} />
                Show this alliance's members on the Leaderboard
              </label>
              <div className="mt-1">
                <Button type="button" size="sm" loading={savingAlliance === a.id} onClick={() => saveAlliance(a)}>Save</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmRotate ? (
        <ConfirmDialog
          title="Generate a new access link?"
          message="The current link will stop working for anyone who hasn't used it yet. Members already signed in on their devices are not affected."
          confirmLabel="Generate new link"
          onConfirm={rotateLink}
          onCancel={() => setConfirmRotate(false)}
        />
      ) : null}
    </div>
  );
}
