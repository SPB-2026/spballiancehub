import React from 'react';
import { EmptyState, LoadingBox, ErrorState } from '../components/ui.jsx';

// Shared admin data table: columns = [{ key, label, render? }]
export default function AdminTable({ columns, rows, loading, error, onRetry, emptyIcon = '📜', emptyTitle, emptyText, keyField = 'id' }) {
  if (loading) return <LoadingBox label="Loading…" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle}>{emptyText}</EmptyState>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={{ textAlign: c.align || 'left' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[keyField]}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
