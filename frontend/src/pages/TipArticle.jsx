import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, Badge } from '../components/ui.jsx';
import { asTagArray } from '../utils/format.js';

const CATEGORY_LABELS = {
  general: 'General Tips',
  heroes: 'Heroes & Troops',
  city: 'City Development',
  resources: 'Resources',
  combat: 'Combat & PvP',
  alliance: 'Alliance Strategy',
  events: 'Events',
  formations: 'Formations & Marches',
  equipment: 'Equipment & Upgrades',
  f2p: 'F2P & Spending',
};

export default function TipArticle() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => api.get(`/articles/${id}`), [id]);

  if (loading) return <div className="page"><LoadingBox label="Opening the tome…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  const a = data;

  return (
    <div className="page">
      <div className="article">
        <Link to="/tips" style={{ fontSize: 13 }}>← All tips</Link>
        <div className="article-head">
          <Badge kind="gold">{CATEGORY_LABELS[a.category] || a.category}</Badge>
          <h1>{a.title}</h1>
        </div>
        {asTagArray(a.tags).length ? (
          <div className="tip-tags" style={{ marginBottom: 24 }}>
            {asTagArray(a.tags).map((t) => <span className="tip-tag" key={t}>#{t}</span>)}
          </div>
        ) : null}
        <div className="article-body">
          {a.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}
