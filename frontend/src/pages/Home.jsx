import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { Button, Badge, LoadingBox, EmptyState, ErrorState, Countdown } from '../components/ui.jsx';
import { fmtDate, fmtTime } from '../utils/format.js';
import {
  IconUsers, IconTrophy, IconCalendar, IconGift, IconBook,
  IconCrown,
} from '../components/icons.jsx';

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

const DEFAULT_HERO = {
  title: 'Welcome to',
  accent: 'SPB Alliance',
  text: 'SPB Alliance is a Kingshot alliance built on teamwork, strategy and consistency. This hub is our home for news, battle plans, tips and everything happening in the alliance. Stay active, stay informed, and march together.',
  primaryLabel: 'View Alliance',
  primaryLink: '/members',
  secondaryLabel: 'Event Calendar',
  secondaryLink: '/calendar',
};

export default function Home() {
  const { settings } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    const [events, news, articles, announcements] = await Promise.all([
      api.get('/events'),
      api.get('/news'),
      api.get('/articles'),
      api.get('/announcements').catch(() => null),
    ]);
    return { events, news, articles: articles.articles || [], announcements: announcements?.announcements || [] };
  }, []);

  if (loading) return <LoadingBox label="Loading the command center…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { events, news, articles, announcements } = data;
  const upcoming = events.filter((e) => e.status === 'upcoming').slice(0, 4);
  const latestNews = news.slice(0, 3);
  const latestTips = articles.slice(0, 3);
  const featuredNews = news.find((n) => n.featured) || null;

  const hero = {
    title: settings?.home_title || DEFAULT_HERO.title,
    accent: settings?.home_accent || DEFAULT_HERO.accent,
    text: settings?.home_text || DEFAULT_HERO.text,
    primaryLabel: settings?.home_primary_label || DEFAULT_HERO.primaryLabel,
    primaryLink: settings?.home_primary_link || DEFAULT_HERO.primaryLink,
    secondaryLabel: settings?.home_secondary_label || DEFAULT_HERO.secondaryLabel,
    secondaryLink: settings?.home_secondary_link || DEFAULT_HERO.secondaryLink,
  };

  return (
    <div className="page">
      {/* HERO — fully editable from the admin Home Page panel */}
      <section className="hero hero-modern" aria-label="Welcome">
        <div>
          <h1>
            {hero.title} <span className="gold">{hero.accent}</span>
          </h1>
          <p className="hero-text">{hero.text}</p>
          <div className="hero-actions">
            <Link to={hero.primaryLink}><Button variant="gold" icon={<IconUsers />}>{hero.primaryLabel}</Button></Link>
            <Link to={hero.secondaryLink}><Button variant="outline" icon={<IconCalendar />}>{hero.secondaryLabel}</Button></Link>
          </div>
          {announcements.length === 0 && settings?.announcement ? (
            <div className="announcement hero-announce" role="note">
              <span className="announce-pill">📣 Announcement</span>
              <span>{settings.announcement}</span>
            </div>
          ) : null}
        </div>

        {settings?.home_banner ? (
          <Link to="/members" className="alliance-card" style={{ display: 'block' }}>
            <img src={settings.home_banner} alt="Alliance banner" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </Link>
        ) : (
          <div className="alliance-card">
            <div className="ac-castle" aria-hidden="true">🏰</div>
            <div className="ac-label">Kingshot Alliance</div>
            <Link to="/leaderboard" className="ac-btn">🏰 Kingshot Alliance</Link>
          </div>
        )}
      </section>

      {/* ANNOUNCEMENTS — admin-managed, prioritized, with expiration */}
      {announcements.length > 0 ? (
        <section className="section" aria-label="Announcements">
          <div className="section-head">
            <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">📣</span> Announcements</h2>
          </div>
          <div className="grid" style={{ gap: 10 }}>
            {announcements.map((a) => (
              <div key={a.id} className="card card-pad" style={{ borderLeft: '3px solid var(--gold)' }}>
                <div className="flex items-center gap-1 wrap">
                  <strong style={{ fontSize: 14.5 }}>{a.title}</strong>
                  <Badge kind="gray">{fmtDate(a.created_at)}</Badge>
                  {a.expires_at ? <Badge kind="blue">until {fmtDate(a.expires_at)}</Badge> : null}
                </div>
                {a.body ? <p className="text-dim" style={{ fontSize: 13.5, marginTop: 6 }}>{a.body}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* LATEST NEWS */}
      <section className="section" aria-label="Latest news">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">📰</span> Latest News</h2>
          <Link to="/news" className="view-all">View all <span className="va-arrow">→</span></Link>
        </div>
        {featuredNews ? (
          <Link to={`/news/${featuredNews.id}`} className="card card-gold card-pad card-hover" style={{ display: 'block', color: 'inherit', marginBottom: 14 }}>
            <div className="flex items-center gap-1 wrap">
              <span style={{ color: 'var(--gold-bright)', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.08em' }}>★ FEATURED</span>
              <span className="cat-pill">{featuredNews.category}</span>
            </div>
            <h3 style={{ fontSize: 20, margin: '8px 0 6px' }}>{featuredNews.title}</h3>
            <p className="text-dim" style={{ fontSize: 14 }}>{featuredNews.summary}</p>
          </Link>
        ) : null}
        {latestNews.length === 0 ? (
          <EmptyState icon="📜" title="No news yet">The scribes are working on the first dispatch.</EmptyState>
        ) : (
          <div className="grid grid-3">
            {latestNews.map((n) => (
              <Link to={`/news/${n.id}`} key={n.id} className="card news-card card-hover" style={{ color: 'inherit' }}>
                {n.cover ? <div className="news-cover"><img src={n.cover} alt="" loading="lazy" /></div> : null}
                <div className="news-body">
                  <span className="cat-pill">{n.category}</span>
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
      </section>

      {/* LATEST TIPS & TRICKS */}
      <section className="section" aria-label="Latest tips and tricks">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">💡</span> Latest Tips &amp; Tricks</h2>
          <Link to="/tips" className="view-all">View all <span className="va-arrow">→</span></Link>
        </div>
        {latestTips.length === 0 ? (
          <EmptyState icon="📖" title="No tips yet">The war library is being written.</EmptyState>
        ) : (
          <div className="grid grid-3">
            {latestTips.map((a) => (
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
      </section>

      {/* UPCOMING EVENTS */}
      <section className="section" aria-label="Upcoming events">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">🗓️</span> Upcoming Events</h2>
          <Link to="/events" className="view-all">View all <span className="va-arrow">→</span></Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon="🗓️" title="No upcoming events">The calendar is clear. New events will appear here when the command schedules them.</EmptyState>
        ) : (
          <div className="grid grid-2">
            {upcoming.map((e, i) => (
              <EventMiniCard key={e.id} event={e} isNext={i === 0} />
            ))}
          </div>
        )}
      </section>

      {/* QUICK ACCESS */}
      <section className="section" aria-label="Quick access">
        <div className="section-head">
          <h2 className="section-title has-icon"><span className="st-icon" aria-hidden="true">⚡</span> Quick Access</h2>
        </div>
        <div className="grid grid-3">
          <QuickLink to="/calendar" icon={<IconCalendar />} title="Calendar" text="Every alliance event on one interactive calendar." />
          <QuickLink to="/leaderboard" icon={<IconCrown />} title="Leaderboard" text="Top contributors and the alliance's finest." />
          <QuickLink to="/events" icon={<IconTrophy />} title="Events" text="War schedules, tournaments and community nights." />
          <QuickLink to="/gift-codes" icon={<IconGift />} title="Gift Codes" text="Redeem alliance gift codes and track your rewards." />
          <QuickLink to="/tips" icon={<IconBook />} title="Tips & Tricks" text="Strategy guides from beginner to advanced." />
        </div>
      </section>

      <div className="ornament mt-3" aria-hidden="true">SPB</div>
    </div>
  );
}

function EventMiniCard({ event, isNext = false }) {
  return (
    <div className={`card card-pad card-hover event-card${isNext ? ' event-card-next' : ''}`}>
      <div className="event-top">
        <div>
          <h3 className="event-title">{event.title}</h3>
          <div className="event-cat">{event.category}{event.location ? ` · ${event.location}` : ''}</div>
        </div>
        {isNext
          ? <Badge kind="gold" dot>Next</Badge>
          : <Badge kind={event.status === 'ongoing' ? 'green' : 'blue'} dot>{event.status}</Badge>}
      </div>
      <div className="event-when">
        <span>Starts: {fmtDate(event.starts_at)} · {fmtTime(event.starts_at)}</span>
        <span>Ends: {fmtDate(event.ends_at)} · {fmtTime(event.ends_at)}</span>
      </div>
      <div className="event-foot">
        <Countdown targetIso={event.status === 'ongoing' ? event.ends_at : event.starts_at} label={event.status === 'ongoing' ? 'ends' : 'in'} />
        <span className="text-dim" style={{ fontSize: 12 }}>{event.description ? `${event.description.length > 80 ? event.description.slice(0, 80) + '…' : event.description}` : ''}</span>
      </div>
    </div>
  );
}

function QuickLink({ to, icon, title, text }) {
  return (
    <Link to={to} className="card card-hover quick-card" style={{ color: 'inherit' }}>
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="text-gold" style={{ fontSize: 12.5, fontWeight: 600 }}>Open →</span>
    </Link>
  );
}
