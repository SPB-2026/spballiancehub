import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import AdminTable from './AdminTable.jsx';
import { fmtDateTime } from '../utils/format.js';
import { IconSearch } from '../components/icons.jsx';

export default function AdminAccessLog() {
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useAsync(
    () => api.get(`/admin/access-log?search=${encodeURIComponent(query)}&limit=200`),
    [query]
  );

  const columns = [
    { key: 'name', label: 'Member', render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'game_user_id', label: 'Game User ID', render: (r) => <span className="mono text-gold">{r.game_user_id}</span> },
    { key: 'visited_at', label: 'Accessed', render: (r) => <span className="mono" style={{ fontSize: 12.5 }}>{fmtDateTime(r.visited_at)}</span> },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Access <span className="text-gold">Log</span></h1>
          <p>Every time a member has unlocked the site via the magic link. Shows the 200 most recent visits.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ width: 230, paddingLeft: 34 }}
            placeholder="Search by member name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search access log"
          />
        </div>
      </div>

      <AdminTable
        columns={columns}
        rows={data?.rows}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyIcon="🔑"
        emptyTitle={query ? `Nothing found for “${query}”.` : 'No access history yet'}
        emptyText={query ? '' : 'When members use the magic link to get in, their visits will show up here.'}
      />
    </div>
  );
}
