import React from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, ErrorState, Badge } from '../components/ui.jsx';
import { num, fmtDateTime } from '../utils/format.js';
import {
  IconUsers, IconCalendar, IconNews, IconBook, IconGift,
  IconTrophy, IconSettings, IconChart, IconClock, IconMegaphone,
} from '../components/icons.jsx';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/dashboard'), []);
  const activity = useAsync(() => api.get('/admin/activity?limit=6'), []);

  if (loading) return <LoadingBox label="Loading command dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const stats = [
    { icon: <IconUsers />, label: 'Members', value: num(data.members_total), note: 'total registered', to: '/spballiancehubadministrator2026/members' },
    { icon: <IconUsers />, label: 'Active Members', value: num(data.members_active), note: 'able to sign in', to: '/spballiancehubadministrator2026/members' },
    { icon: <IconCalendar />, label: 'Events', value: num(data.events_total), note: `${num(data.events_upcoming)} up · ${num(data.events_ongoing)} live`, to: '/spballiancehubadministrator2026/events' },
    { icon: <IconCalendar />, label: 'Upcoming', value: num(data.events_upcoming), note: 'calendar ahead', to: '/spballiancehubadministrator2026/events' },
    { icon: <IconNews />, label: 'Published News', value: num(data.news_published), note: 'visible to members', to: '/spballiancehubadministrator2026/news' },
    { icon: <IconBook />, label: 'Published Tips', value: num(data.tips_published), note: 'knowledge base', to: '/spballiancehubadministrator2026/tips' },
    { icon: <IconMegaphone />, label: 'Announcements', value: num(data.announcements_active ?? 0), note: `${num(data.announcements_total ?? 0)} total`, to: '/spballiancehubadministrator2026/announcements' },
    { icon: <IconGift />, label: 'Gift Codes', value: num(data.gift_codes), note: `${num(data.active_gifs)} active now`, to: '/spballiancehubadministrator2026/gift-codes' },
    { icon: <IconTrophy />, label: 'Admins', value: num(data.admins), note: 'elevated accounts', to: '/spballiancehubadministrator2026/admins' },
    { icon: <IconSettings />, label: 'Alliance Rank', value: data.settings?.alliance_rank || '—', note: 'editable in settings', to: '/spballiancehubadministrator2026/settings', small: true },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Command <span className="text-gold">Dashboard</span></h1>
          <p>Everything the command needs at a glance. All numbers come from the live database.</p>
        </div>
        <Badge kind="gold">Admin</Badge>
      </div>

      <div className="grid grid-4">
        {stats.map((s) => (
          <Link to={s.to} key={s.label} className="card card-pad admin-stat card-hover" style={{ color: 'inherit' }}>
            <span className="stat-icon" aria-hidden="true">{s.icon}</span>
            <div>
              <div className="stat-value" style={s.small ? { fontSize: 16, fontFamily: 'var(--font-body)', fontWeight: 700 } : undefined}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-note">{s.note}</div>
            </div>
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Quick Actions</h2>
          <div className="section-rule" />
        </div>
        <div className="grid grid-4">
          {[
            { to: '/spballiancehubadministrator2026/members', label: 'Add a member', icon: <IconUsers /> },
            { to: '/spballiancehubadministrator2026/events', label: 'Schedule an event', icon: <IconChart /> },
            { to: '/spballiancehubadministrator2026/announcements', label: 'Post an announcement', icon: <IconMegaphone /> },
            { to: '/spballiancehubadministrator2026/news', label: 'Publish news', icon: <IconNews /> },
            { to: '/spballiancehubadministrator2026/media', label: 'Upload media', icon: <IconSettings /> },
          ].map((q) => (
            <Link key={q.to + q.label} to={q.to} className="card card-pad card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'inherit' }}>
              <span className="stat-icon" aria-hidden="true" style={{ flexShrink: 0 }}>{q.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity (audit trail preview) */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">🕐</span> Recent Activity</h2>
          <Link to="/spballiancehubadministrator2026/activity" className="view-all">Full log <span className="va-arrow">→</span></Link>
        </div>
        {activity.loading ? <LoadingBox label="Loading activity…" /> :
          activity.error ? <ErrorState error={activity.error} onRetry={activity.reload} /> :
          !activity.data?.length ? (
            <div className="state-box" style={{ padding: '28px 20px' }}>
              <span className="state-icon" aria-hidden="true">📜</span>
              <p>Nothing logged yet — changes you make in the admin panel appear here.</p>
            </div>
          ) : (
            <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.data.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 wrap" style={{ fontSize: 13 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="stat-icon" style={{ width: 26, height: 26, fontSize: 12, borderRadius: 7 }} aria-hidden="true"><IconClock /></span>
                    <span className="mono text-gold" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{r.action}</span>
                  </span>
                  <span className="text-dim" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {r.admin_name} · <span className="mono">{fmtDateTime(r.at)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
