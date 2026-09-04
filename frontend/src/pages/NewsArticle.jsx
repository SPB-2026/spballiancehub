import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, Badge } from '../components/ui.jsx';
import { fmtDate } from '../utils/format.js';

export default function NewsArticle() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => api.get(`/news/${id}`), [id]);

  if (loading) return <div className="page"><LoadingBox label="Opening the scroll…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  const n = data;

  return (
    <div className="page">
      <div className="article">
        <Link to="/news" style={{ fontSize: 13 }}>← All news</Link>
        {n.cover ? (
          <div className="article-cover mt-1">
            <img src={n.cover} alt="" style={{ width: '100%' }} />
          </div>
        ) : null}
        <div className="article-head">
          <h1>{n.title}</h1>
          <div className="article-meta">
            <Badge kind="gold">{n.category}</Badge>
            <span>{n.author}</span>
            <span>·</span>
            <span>{fmtDate(n.published_at || n.created_at)}</span>
          </div>
        </div>
        {n.summary ? <p className="article-meta" style={{ marginBottom: 24, color: 'var(--text-2)', fontStyle: 'italic' }}>{n.summary}</p> : null}
        <div className="article-body">
          {n.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}
