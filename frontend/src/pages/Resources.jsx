import React from 'react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState } from '../components/ui.jsx';

// Links to outside sites the command recommends. Managed in Admin → Resources.
export default function Resources() {
  const { data, loading, error, reload } = useAsync(() => api.get('/resources'), []);

  if (loading) return <div className="page"><LoadingBox label="Loading resources…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  // Group by category, keeping the order links were arranged in.
  const groups = [];
  const index = new Map();
  for (const r of data || []) {
    const name = r.category || 'More links';
    if (!index.has(name)) { index.set(name, groups.length); groups.push({ name, items: [] }); }
    groups[index.get(name)].items.push(r);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Useful <span className="flourish">Resources</span></h1>
          <p className="page-sub">Handy sites for scouting players, alliances and kingdoms. Each one opens in a new tab.</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="🔗" title="No links yet">The command will add useful sites here.</EmptyState>
      ) : groups.map((g) => (
        <section key={g.name} className="section" aria-label={g.name}>
          <div className="section-head">
            <h2 className="section-title">{g.name}</h2>
          </div>
          <div className="grid grid-3">
            {g.items.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card card-pad card-hover resource-card">
                <div className="resource-title">{r.title}</div>
                {r.description ? <p className="resource-desc">{r.description}</p> : null}
                <span className="resource-open">Open site →</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
