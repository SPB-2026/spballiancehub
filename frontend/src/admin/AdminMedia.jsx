import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from './Toast.jsx';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState, Button, ConfirmDialog } from './ui.jsx';
import { fmtDateTime } from '../utils/format.js';
import { IconPlus, IconTrash } from './icons.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'https://spballiancehub.onrender.com';

function mediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AdminMedia() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/media'), []);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const item = await api.upload('/admin/media', file, 'image');
      toast.success('Image uploaded', `${item.width || 0}×${item.height || 0}px · ${Math.max(1, Math.round((item.size || 0) / 1024))} KB`);
      reload();
    } catch (err) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl(rawUrl) {
    const fullUrl = mediaUrl(rawUrl);
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.info('URL copied', fullUrl);
    } catch {
      toast.error('Copy failed', 'Select the URL manually.');
    }
  }

  async function doRemove(m) {
    setBusy(true);
    try {
      await api.del(`/admin/media/${m.id}`);
      toast.info('Image deleted', m.filename);
      setConfirm(null);
      reload();
    } catch (err) {
      toast.error('Delete failed', err.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Media <span className="text-gold">Library</span></h1>
          <p>Upload images once and reuse them across news covers, event images, tips, the Home banner, favicon and logo.</p>
        </div>
        <label style={{ display: 'inline-flex', cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <span className="btn btn-gold" style={{ opacity: uploading ? 0.6 : 1 }} aria-hidden="true">
            {uploading ? 'Uploading…' : <><IconPlus /> Upload image</>}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={upload} disabled={uploading} />
        </label>
      </div>

      {loading ? <LoadingBox label="Loading media…" /> :
        error ? <ErrorState error={error} onRetry={reload} /> :
        !data?.length ? (
          <EmptyState icon="🖼️" title="No media yet" emptyText="Upload the first image (JPG, PNG or WebP, max 2 MB) to build the library." />
        ) : (
          <div className="media-grid">
            {data.map((m) => {
              const srcUrl = mediaUrl(m.url || m.path);
              return (
                <div className="media-item" key={m.id}>
                  <div style={{ width: '100%', height: '140px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={srcUrl} 
                      alt={m.filename || 'Media image'} 
                      loading="lazy" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerText = '⚠️ Image load error';
                        e.target.parentNode.style.color = '#ff6b6b';
                        e.target.parentNode.style.fontSize = '12px';
                      }}
                    />
                  </div>
                  <div className="media-item-info">
                    <span className="mono" style={{ fontSize: 11 }}>
                      {m.width ? `${m.width}×${m.height}` : 'Image'} · {Math.max(1, Math.round((m.size || 0) / 1024))} KB
                    </span>
                    <span className="text-dim" style={{ fontSize: 11 }}>
                      {m.uploaded_by ? `by ${m.uploaded_by} · ` : ''}{fmtDateTime(m.created_at)}
                    </span>
                    <div className="media-item-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => copyUrl(m.url || m.path)}>Copy URL</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(m)} title="Delete image"><IconTrash size={13} /> Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <p className="text-dim mt-3" style={{ fontSize: 12.5 }}>
        Images still used by content (covers, banners, logo) cannot be deleted — clear them from that content first, so no page ever shows a broken image.
      </p>

      {confirm ? (
        <ConfirmDialog
          title="Delete image?"
          message={`“${confirm.filename}” will be permanently removed from the library.`}
          confirmLabel="Delete image"
          danger
          loading={busy}
          onConfirm={() => doRemove(confirm)}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
