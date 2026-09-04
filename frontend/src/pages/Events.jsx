import React from 'react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, Badge, Countdown, EmptyState } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils/format.js';

const SECTIONS = [
  { key: 'upcoming', title: 'Upcoming', icon: '🗓️', desc: 'Events yet to begin — plan your participation now.' },
  { key: 'ongoing', title: 'Ongoing', icon: '⚔️', desc: 'Happening right now. Report in on arrival.' },
  { key: 'completed', title: 'Completed', icon: '🏁', desc: 'Recent events and their outcomes.' },
];

export default function Events() {
  const { data, loading, error, reload } = useAsync(() => api.get('/events'), []);

  if (loading) return <div className="page"><LoadingBox label="Gathering the event scrolls…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Events &amp; <span className="flourish">Tournaments</span></h1>
          <p className="page-sub">War schedules, tournaments, community nights and maintenance windows — organized by status.</p>
        </div>
      </div>

      {SECTIONS.map((sec) => {
        const events = data
          .filter((e) => e.status === sec.key)
          .sort((a, b) => (sec.key === 'completed' ? new Date(b.starts_at) - new Date(a.starts_at) : new Date(a.starts_at) - new Date(b.starts_at)));

        return (
          <section className="events-section" key={sec.key} aria-label={sec.title}>
            <div className="section-head">
              <h2 className="section-title">
                <span aria-hidden="true" style={{ marginRight: 8 }}>{sec.icon}</span>{sec.title}
              </h2>
              <div className="section-rule" />
            </div>
            {events.length === 0 ? (
              <EmptyState icon="📜" title={`No ${sec.key} events`}>{sec.key === 'completed' ? 'Completed events will appear here after they end.' : 'The command has not scheduled any ' + sec.key + ' events yet.'}</EmptyState>
            ) : (
              <div className="grid" style={{ gap: 14 }}>
                {events.map((e) => <EventRow key={e.id} event={e} />)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EventRow({ event }) {
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const sameDay = start.toDateString() === end.toDateString();

  return (
    <div className="card event-row">
      <div className="event-date">
        <span className="d">{start.getDate()}</span>
        <span className="m">{start.toLocaleDateString(undefined, { month: 'short' })}</span>
        <span className="t">{fmtTime(event.starts_at)}{sameDay ? `–${fmtTime(event.ends_at)}` : ''}</span>
      </div>

      <div className="event-main">
        <div className="flex items-center gap-1 wrap">
          <h3>{event.title}</h3>
          <Badge kind={event.status === 'ongoing' ? 'green' : event.status === 'completed' ? 'gray' : 'blue'} dot>{event.status}</Badge>
          <Badge kind="gray">{event.category}</Badge>
        </div>
        <p>{event.description}</p>
        <div className="flex gap-2 wrap" style={{ marginTop: 8 }}>
          <span className="participation">📅 {fmtDate(event.starts_at)} · {fmtTime(event.starts_at)} → {fmtDate(event.ends_at)} · {fmtTime(event.ends_at)}</span>
          {event.location ? <span className="participation">📍 {event.location}</span> : null}
        </div>
      </div>

      <div className="event-side">
        {event.image ? (
          <img
            src={event.image}
            alt=""
            loading="lazy"
            style={{ width: '100%', maxWidth: 160, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8, marginBottom: 10, border: '1px solid var(--border)' }}
          />
        ) : null}
        {event.status !== 'completed' ? (
          <Countdown targetIso={event.status === 'ongoing' ? event.ends_at : event.starts_at} label={event.status === 'ongoing' ? 'ends in' : 'starts in'} />
        ) : (
          <Badge kind="gray">ended {fmtDate(event.ends_at)}</Badge>
        )}
      </div>
    </div>
  );
}
