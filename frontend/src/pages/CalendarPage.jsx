import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, Badge, Countdown, EmptyState } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils/format.js';
import { IconChevronL, IconChevronR } from '../components/icons.jsx';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { data, loading, error, reload } = useAsync(() => api.get('/events'), []);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-based
  const [selected, setSelected] = useState(() => now.toISOString().slice(0, 10));

  const events = data || [];

  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const start = new Date(e.starts_at);
      const end = new Date(e.ends_at);
      const day = start;
      const endDay = new Date(end); endDay.setHours(0, 0, 0, 0);
      for (let d = new Date(day); d <= endDay; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, []);
        // Only mark the start day to avoid clutter; multi-day spans show on start day
        if (key === `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`) {
          map.get(key).push(e);
        }
      }
    }
    return map;
  }, [events]);

  function shiftMonth(delta) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: `pre-${i}`, other: true, day: new Date(viewYear, viewMonth - 1, 0).getDate() - firstDow + 1 + i });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d });
  while (cells.length % 7 !== 0) cells.push({ key: `post-${cells.length}`, other: true, day: cells.length - (firstDow + daysInMonth) + 1 });

  const selectedEvents = byDay.get(selected) || [];
  const sideEvents = events
    .filter((e) => e.status !== 'completed')
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 5);

  if (loading) return <div className="page"><LoadingBox label="Unrolling the calendar…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alliance <span className="flourish">Calendar</span></h1>
          <p className="page-sub">Every scheduled event — upcoming, ongoing and completed — at a glance.</p>
        </div>
      </div>

      <div className="cal-layout">
        <div className="card calendar-card">
          <div className="cal-head">
            <button className="cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <h2 className="cal-title">{monthLabel}</h2>
            <button className="cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="cal-grid" role="grid" aria-label={`${monthLabel} calendar`}>
            {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
            {cells.map((c) => {
              const dayEvents = c.other ? [] : (byDay.get(c.key) || []);
              const isToday = c.key === todayKey;
              const isSelected = c.key === selected;
              return (
                <button
                  key={c.key}
                  className={`cal-cell${c.other ? ' other-month' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  onClick={() => !c.other && setSelected(c.key)}
                  aria-label={`${fmtDate(c.key)}${dayEvents.length ? `, ${dayEvents.length} event(s)` : ''}`}
                  style={isSelected && !c.other ? { borderColor: 'var(--gold)', background: 'var(--gold-faint)' } : undefined}
                >
                  <span className="daynum">{c.day}</span>
                  {dayEvents.length ? (
                    <span className="cal-dots">
                      {dayEvents.slice(0, 4).map((e) => <span key={e.id} className={`cal-dot ${e.status}`} title={e.title} />)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span><span className="cal-dot upcoming" style={{ display: 'inline-block' }} /> Upcoming</span>
            <span><span className="cal-dot ongoing" style={{ display: 'inline-block' }} /> Ongoing</span>
            <span><span className="cal-dot completed" style={{ display: 'inline-block' }} /> Completed</span>
          </div>

          <div className="section" style={{ marginTop: 20 }}>
            <div className="section-head">
              <h3 className="section-title">On {fmtDate(selected)}</h3>
              <div className="section-rule" />
            </div>
            {selectedEvents.length === 0 ? (
              <EmptyState icon="🌙" title="Nothing scheduled" >No events start on this day. Pick another date or check the list on the right.</EmptyState>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                {selectedEvents.map((e) => <SideEvent key={e.id} event={e} />)}
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="card card-pad">
            <h3>Next up</h3>
            {sideEvents.length === 0 ? (
              <p className="text-dim" style={{ fontSize: 13 }}>Nothing on the horizon.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sideEvents.map((e) => <SideEvent key={e.id} event={e} />)}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SideEvent({ event }) {
  return (
    <div className="card cal-side-event card-hover">
      <div className="event-top" style={{ marginBottom: 6 }}>
        <div>
          <div className="event-title" style={{ fontSize: 14 }}>{event.title}</div>
          <div className="event-cat">{fmtDate(event.starts_at)} · {fmtTime(event.starts_at)}–{fmtTime(event.ends_at)}</div>
        </div>
        <Badge kind={event.status === 'ongoing' ? 'green' : event.status === 'completed' ? 'gray' : 'blue'} dot>{event.status}</Badge>
      </div>
      {event.status === 'upcoming' ? <Countdown targetIso={event.starts_at} /> : null}
    </div>
  );
}
