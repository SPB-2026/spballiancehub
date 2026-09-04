import React, { useState } from 'react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState, Badge } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import { num } from '../utils/format.js';

export default function Leaderboard() {
  const [metric, setMetric] = useState('score');
  const { data, loading, error, reload } = useAsync(() => api.get(`/leaderboard?metric=${metric}`), [metric]);

  if (loading) return <div className="page"><LoadingBox label="Weighing the champions…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  const rows = data;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alliance <span className="flourish">Leaderboard</span></h1>
          <p className="page-sub">
            Live standings from real member data. Stats are maintained by the command after every event.
          </p>
        </div>
        <div className="filter-row" style={{ marginBottom: 0 }}>
          <button className={`filter-chip${metric === 'score' ? ' active' : ''}`} onClick={() => setMetric('score')}>By Power</button>
          <button className={`filter-chip${metric === 'contributions' ? ' active' : ''}`} onClick={() => setMetric('contributions')}>By Contributions</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="🏆" title="No active members to rank">Active members with stats will appear here.</EmptyState>
      ) : (
        <>
          <div className="podium" aria-label="Top three">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((r) => {
              const isFirst = r.rank === 1;
              return (
                <div key={r.id} className={`card pod${isFirst ? ' pod-1' : ''}${r.rank === 2 ? ' pod-2' : ''}${r.rank === 3 ? ' pod-3' : ''}`}>
                  <div className="pod-rank">{r.rank === 1 ? 'I' : r.rank === 2 ? 'II' : 'III'}</div>
                  <Avatar src={r.avatar} name={r.name} size={64} />
                  <div className="pod-name">{r.name}</div>
                  <div className="pod-score">
                    {num(r[metric])} {metric === 'score' ? 'points' : 'contributions'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Player</th>
                  <th scope="col">Power</th>
                  <th scope="col">Contributions</th>
                  <th scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ color: 'var(--gold)' }}>#{r.rank}</td>
                    <td>
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                        <Avatar src={r.avatar} name={r.name} size={28} /> {r.name}
                      </span>
                    </td>
                    <td className="mono">{num(r.score)}</td>
                    <td className="mono">{num(r.contributions)}</td>
                    <td><Badge kind={r.role === 'R5' || r.role === 'R4' ? 'gold' : r.role === 'R3' ? 'blue' : 'gray'}>{r.role}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
