import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from './Toast.jsx';
import api from '../services/api.js';
import { Button, Modal, LoadingBox, ErrorState, EmptyState } from '../components/ui.jsx';
import { IconImage, IconPlus } from './icons.jsx';

// Reusable image picker: shows the uploaded media library, allows uploads,
// and returns the selected image URL. Used by News, Events, Tips, Home and Settings.
export default function MediaPicker({ onPick, initial = '', label = 'Choose image' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="logo-preview" style={{ marginBottom: 6 }}>
        {initial ? <img src={initial} alt="Current image" /> : <span className="logo-default skeleton" aria-hidden="true" />}
        <div style={{ flex: 1 }}>
          <Button type="button" variant="outline" size="sm" icon={<IconImage />} onClick={() => setOpen(true)}>
            {initial ? 'Change image' : label}
          </Button>
          {initial ? (
            <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => onPick('')}>Remove image</button>
          ) : null}
        </div>
      </div>
      {open ? (
        <MediaPickerModal
          initial={initial}
          onClose={() => setOpen(false)}
          onPick={(url) => { onPick(url); setOpen(false); }}
        />
      ) : null}
    </>
  );
}

function MediaPickerModal({ initial, onClose, onPick }) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/media'), []);
  const [uploading, setUploading] = useState(false);

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const item = await api.upload('/admin/media', file, 'image');
      toast.success('Image uploaded', `${item.width}×${item.height}px — selected for you.`);
      onPick(item.url);
    } catch (err) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.info('URL copied', url);
    } catch {
      toast.error('Copy failed', 'Select the URL manually.');
    }
  }

  return (
    <Modal title="Media Library" onClose={onClose} wide footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div
        style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) {
            const dt = new DataTransfer();
            dt.items.add(f);
            upload({ target: { files: dt.files, value: '' } });
          }
        }}
      >
        <label style={{ display: 'inline-flex', cursor: 'pointer' }}>
          <span className="btn btn-gold btn-sm" style={{ opacity: uploading ? 0.6 : 1 }} aria-hidden="true">
            {uploading ? 'Uploading…' : 'Upload image'}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={upload} disabled={uploading} />
        </label>
        <span className="text-dim" style={{ fontSize: 12.5 }}>
          JPG, PNG or WebP · max 2 MB · 32–2048px. You can also drop a file here.
        </span>
      </div>

      {loading ? <LoadingBox label="Loading media…" /> :
        error ? <ErrorState error={error} onRetry={reload} /> :
        !data?.length ? (
          <EmptyState icon={<IconPlus />} title="No media yet" emptyText="Upload the first image to reuse it across news, events and the Home banner." />
        ) : (
          <div className="media-grid">
            {data.map((m) => (
              <div className="media-item" key={m.id} style={m.url === initial ? { borderColor: 'var(--gold)' } : undefined}>
                <img src={m.url} alt={m.filename} loading="lazy" />
                <div className="media-item-info">
                  <span className="mono" style={{ fontSize: 11 }}>{m.width}×{m.height} · {Math.max(1, Math.round(m.size / 1024))} KB</span>
                  <div className="media-item-actions">
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => onPick(m.url)}>Select</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyUrl(m.url)} title="Copy URL">Copy URL</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </Modal>
  );
}
