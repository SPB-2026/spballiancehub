import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import MediaPicker from '../components/MediaPicker.jsx';
import { Button, Field, Badge } from '../components/ui.jsx';

const DEFAULTS = {
  home_title: 'Welcome to',
  home_accent: 'SPB Alliance',
  home_text: 'SPB Alliance is a Kingshot alliance built on teamwork, strategy and consistency. This hub is our home for news, battle plans, tips and everything happening in the alliance. Stay active, stay informed, and march together.',
  home_primary_label: 'View Alliance',
  home_primary_link: '/members',
  home_secondary_label: 'Event Calendar',
  home_secondary_link: '/calendar',
};

export default function AdminHome() {
  const { settings, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    home_title: settings?.home_title || DEFAULTS.home_title,
    home_accent: settings?.home_accent || DEFAULTS.home_accent,
    home_text: settings?.home_text || DEFAULTS.home_text,
    home_primary_label: settings?.home_primary_label || DEFAULTS.home_primary_label,
    home_primary_link: settings?.home_primary_link || DEFAULTS.home_primary_link,
    home_secondary_label: settings?.home_secondary_label || DEFAULTS.home_secondary_label,
    home_secondary_link: settings?.home_secondary_link || DEFAULTS.home_secondary_link,
    home_banner: settings?.home_banner || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put('/admin/settings', form);
      await refresh();
      toast.success('Home page updated', 'Members see the new Home content immediately.');
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
          <h1>Home <span className="text-gold">Content</span></h1>
          <p>Everything on the member Home page is editable here — no code changes needed.</p>
        </div>
        <Badge kind="gold">Admin</Badge>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card card-gold card-pad" onSubmit={save}>
          <h2 style={{ fontSize: 17, marginBottom: 16 }}>Hero Section</h2>
          <div className="settings-form">
            <Field label="Title (white part)" id="h-title" hint="e.g. “Welcome to”">
              <input id="h-title" className="input" value={form.home_title} maxLength={60} onChange={(e) => setForm({ ...form, home_title: e.target.value })} required />
            </Field>
            <Field label="Title accent (gold part)" id="h-accent" hint="e.g. “SPB Alliance”. Leave empty for a single-color title.">
              <input id="h-accent" className="input" value={form.home_accent} maxLength={60} onChange={(e) => setForm({ ...form, home_accent: e.target.value })} />
            </Field>
            <Field label="Description" id="h-text">
              <textarea id="h-text" className="textarea" style={{ minHeight: 110 }} value={form.home_text} maxLength={500} onChange={(e) => setForm({ ...form, home_text: e.target.value })} />
            </Field>
          </div>
          <h2 style={{ fontSize: 17, margin: '20px 0 16px' }}>Action Buttons</h2>
          <div className="settings-form">
            <Field label="Primary button — label" id="h-pl">
              <input id="h-pl" className="input" value={form.home_primary_label} maxLength={40} onChange={(e) => setForm({ ...form, home_primary_label: e.target.value })} required />
            </Field>
            <Field label="Primary button — link" id="h-pu" hint="Internal site link, e.g. /members">
              <input id="h-pu" className="input" value={form.home_primary_link} maxLength={120} onChange={(e) => setForm({ ...form, home_primary_link: e.target.value })} required />
            </Field>
            <Field label="Secondary button — label" id="h-sl">
              <input id="h-sl" className="input" value={form.home_secondary_label} maxLength={40} onChange={(e) => setForm({ ...form, home_secondary_label: e.target.value })} required />
            </Field>
            <Field label="Secondary button — link" id="h-su" hint="Internal site link, e.g. /calendar">
              <input id="h-su" className="input" value={form.home_secondary_link} maxLength={120} onChange={(e) => setForm({ ...form, home_secondary_link: e.target.value })} required />
            </Field>
          </div>
          <h2 style={{ fontSize: 17, margin: '20px 0 10px' }}>Banner Image (right card)</h2>
          <Field label="" hint="Optional. Shown in the hero's right card instead of the castle emblem. Pick from the Media library.">
            <MediaPicker initial={form.home_banner} onPick={(url) => setForm({ ...form, home_banner: url })} label="Choose banner" />
          </Field>

          {error ? <div className="form-error">{error}</div> : null}
          <div className="mt-2">
            <Button type="submit" loading={saving}>Save Home page</Button>
          </div>
        </form>

        <div className="card card-pad" style={{ position: 'sticky', top: 78 }}>
          <h2 style={{ fontSize: 15, marginBottom: 14, color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live preview</h2>
          <div className="hero" style={{ padding: 22, borderRadius: 12 }}>
            <h1 style={{ fontSize: 26, lineHeight: 1.15, marginBottom: 10 }}>
              {form.home_title || 'Welcome to'}{' '}
              {form.home_accent ? <span className="gold">{form.home_accent}</span> : null}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{form.home_text || '…'}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="btn btn-gold btn-sm">{form.home_primary_label || 'Primary'} → {form.home_primary_link || '/…'}</span>
              <span className="btn btn-outline btn-sm">{form.home_secondary_label || 'Secondary'} → {form.home_secondary_link || '/…'}</span>
            </div>
            <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(168,179,194,0.15)' }}>
              {form.home_banner
                ? <img src={form.home_banner} alt="Banner preview" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }} />
                : <div style={{ padding: '26px 12px', textAlign: 'center', fontSize: 30 }} aria-hidden="true">🏰</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
