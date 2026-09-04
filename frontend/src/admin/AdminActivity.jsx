import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../components/Toast.jsx';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { Button, Badge, ConfirmDialog } from '../components/ui.jsx';
import { fmtDateTime } from '../utils/format.js';
import { IconTrash } from '../components/icons.jsx';

export default function AdminActivity() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/activity?limit=200'), []);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doClear() {
    setBusy(true);
    try {
      const res = await api.del('/admin/activity');
      toast.info('Activity log cleared', `${res.removed} entries removed.`);
      setConfirm(false);
      reload();
    } catch (err) {
      toast.error('Clear failed', err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'at', label: 'When', render: (r) => <span className="mono" style={{ fontSize: 12.5 }}>{fmtDateTime(r.at)}</span> },
    { key: 'admin_name', label: 'Admin', render: (r) => <span style={{ fontWeight: 600 }}>{r.admin_name}</span> },
    { key: 'action', label: 'Action', render: (r) => <span className="mono text-gold" style={{ fontSize: 12.5 }}>{r.action}</span> },
    {
      key: 'status', label: 'Status', align: 'right', render: (r) => (
        <Badge kind={r.status < 300 ? 'green' : 'orange'}>{r.status}</Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Activity <span className="text-gold">Log</span></h1>
          <p>Every successful change made in the admin panel — who did what, and when. Shows the 200 most recent entries.</p>
        </div>
        <Button
          variant="ghost"
          icon={<IconTrash />}
          onClick={() => setConfirm(true)}
          disabled={!data?.length}
        >
          Clear log
        </Button>
      </div>

      <AdminTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="📜"
        emptyTitle="No activity yet"
        emptyText="Changes you make in the admin panel will be recorded here."
      />

      {confirm ? (
        <ConfirmDialog
          title="Clear activity log?"
          message="All audit entries will be permanently removed. This cannot be undone."
          confirmLabel="Clear log"
          danger
          loading={busy}
          onConfirm={doClear}
          onCancel={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
