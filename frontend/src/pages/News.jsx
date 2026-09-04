import React from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, EmptyState } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';

export default function News() {
  const { data, loading, error, reload } = useAsync(() => api.get('/news'), []);

  if (loading) return <div className="page"><LoadingBox label="Fetching the dispatches…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alliance <span className="flourish">News</span></h1>
          <p className="page-sub">Official announcements, war reports and dispatches from the command.</p>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState icon="📜" title="No published news">When the command publishes an article, it will appear here.</EmptyState>
      ) : (
        <div className="grid grid-3">
          {data.map((n) => (
            <Link to={`/news/${n.id}`} key={n.id} className="card news-card card-hover" style={{ color: 'inherit' }}>
              {n.cover ? <div className="news-cover"><img src={n.cover} alt="" loading="lazy" /></div> : null}
              <div className="news-body">
                <div className="flex items-center gap-1 wrap">
                  {n.featured ? <span style={{ color: 'var(--gold-bright)', fontSize: 12, fontWeight: 700 }}>★ Featured</span> : null}
                  <span className="cat-pill">{n.category}</span>
                </div>
                <h3 className="news-title">{n.title}</h3>
                <p className="news-summary">{n.summary}</p>
                <div className="card-foot">
                  <span className="cf-date">{fmtDate(n.published_at || n.created_at)}</span>
                  <span className="read-more">Read more <span className="rm-arrow">→</span></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
