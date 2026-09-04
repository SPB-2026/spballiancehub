import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';

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

const CATEGORY_COLORS = {
  general: 'red',
  heroes: 'orange',
  city: 'gold',
  resources: 'blue',
  combat: 'violet',
  alliance: 'green',
  events: 'orange',
  formations: 'blue',
  equipment: 'brown',
  f2p: 'gray',
};

export default function Tips() {
  const { data, loading, error, reload } = useAsync(() => api.get('/articles'), []);
  const [filter, setFilter] = useState('all');

  if (loading) return <div className="page"><LoadingBox label="Consulting the war library…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  const articles = data.articles.filter((a) => filter === 'all' || a.category === filter);
  const categories = data.categories;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tips &amp; <span className="flourish">Tricks</span></h1>
          <p className="page-sub">Strategy knowledge from the alliance — from your first day to the officer's seat.</p>
        </div>
      </div>

      <div className="filter-row" role="tablist" aria-label="Filter by category">
        <button className={`filter-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} role="tab" aria-selected={filter === 'all'}>
          All
        </button>
        {categories.map((c) => (
          <button key={c} className={`filter-chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)} role="tab" aria-selected={filter === c}>
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {articles.length === 0 ? (
        <EmptyState icon="📖" title="No articles in this category yet">The library is being written. Check another category.</EmptyState>
      ) : (
        <div className="grid grid-3">
          {articles.map((a) => (
            <Link to={`/tips/${a.id}`} key={a.id} className="card tip-card card-hover" style={{ color: 'inherit' }}>
              <span className={`cat-pill${CATEGORY_COLORS[a.category] ? ` ${CATEGORY_COLORS[a.category]}` : ''}`}>
                {CATEGORY_LABELS[a.category] || a.category}
              </span>
              <h3>{a.title}</h3>
              <p>{a.body.split(/\n\n+/)[0]}</p>
              <div className="card-foot">
                <span className="cf-date">{fmtDate(a.published_at)}</span>
                <span className="read-more">Read more <span className="rm-arrow">→</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
