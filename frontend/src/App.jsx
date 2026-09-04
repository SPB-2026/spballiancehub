import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import { LoadingBox } from './components/ui.jsx';

import Home from './pages/Home.jsx';
import Members from './pages/Members.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Events from './pages/Events.jsx';
import News from './pages/News.jsx';
import NewsArticle from './pages/NewsArticle.jsx';
import Tips from './pages/Tips.jsx';
import TipArticle from './pages/TipArticle.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import GiftCodes from './pages/GiftCodes.jsx';
import PolicyPage from './pages/Policy.jsx';
import NotFound from './pages/NotFound.jsx';

import MemberLayout from './layouts/MemberLayout.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminMembers from './admin/AdminMembers.jsx';
import AdminEvents from './admin/AdminEvents.jsx';
import AdminNews from './admin/AdminNews.jsx';
import AdminTips from './admin/AdminTips.jsx';
import AdminGifts from './admin/AdminGifts.jsx';
import AdminAdmins from './admin/AdminAdmins.jsx';
import AdminActivity from './admin/AdminActivity.jsx';
import AdminHome from './admin/AdminHome.jsx';
import AdminAnnouncements from './admin/AdminAnnouncements.jsx';
import AdminMedia from './admin/AdminMedia.jsx';
import AdminLeaderboard from './admin/AdminLeaderboard.jsx';
import AdminProfile from './admin/AdminProfile.jsx';
import AdminSocial from './admin/AdminSocial.jsx';
import AdminSettings from './admin/AdminSettings.jsx';

const DEFAULT_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath d='M32 4 56 12v20c0 14-10 23-24 28C18 55 8 46 8 32V12z' fill='%230B1728' stroke='%23D4AF37' stroke-width='3'/%3E%3Ctext x='32' y='38' text-anchor='middle' font-family='Georgia' font-size='16' fill='%23D4AF37'%3ESP%3C/text%3E%3C/svg%3E";

// Maintenance mode: the member-facing site shows a notice page instead of
// content. Logged-in admins are never blocked, and the login page always
// works (admins use it during maintenance; members simply cannot access
// the site until it is back).
function MaintenanceNotice() {
  const { settings } = useAuth();
  return (
    <div className="login-v2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="state-box" style={{ maxWidth: 520, border: '1px solid var(--gold-dim)', background: 'rgba(13,17,32,0.9)' }}>
        <span className="state-icon" aria-hidden="true">🛠️</span>
        <h3>{settings?.alliance_name || 'SPB Alliance'} is under maintenance</h3>
        <p>
          The command is working on the hub right now. Please check back shortly —
          nothing has been lost.
        </p>
        <Link to="/spballiancehubadministrator2026" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 13 }}>
          Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="state-box" style={{ maxWidth: 480 }}>
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <h3>Something went wrong on this page</h3>
            <p style={{ wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</p>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
              This section encountered an unexpected error. The rest of the hub is unaffected.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* In-place retry: clearing the error re-renders the crashed section. */}
              <button className="btn btn-gold" onClick={() => this.setState({ error: null })}>
                Try Again
              </button>
              <button className="btn btn-ghost" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



export default function App() {
  const { user, booting, settings } = useAuth();
  const pathname = useLocation().pathname;

  // Admin-managed favicon + meta description (defaults stay when unset).
  React.useEffect(() => {
    if (!settings) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = settings.favicon || DEFAULT_FAVICON;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && settings.description) meta.setAttribute('content', settings.description);
  }, [settings]);

  if (booting) {
    return (
      <div className="loading-box" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Preparing the command center…</span>
      </div>
    );
  }

  if (settings?.maintenance && user?.type !== 'admin' && !pathname.startsWith('/spballiancehubadministrator2026')) {
    return <MaintenanceNotice />;
  }

  return (
    <ErrorBoundary>
    <Routes>
      {/* Public website — no login required */}
      <Route element={<MemberLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/members" element={<Members />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/events" element={<Events />} />
        {/* /chat redirected: the Chat feature was removed (old links land on Home) */}
        <Route path="/chat" element={<Navigate to="/" replace />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsArticle />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/tips/:id" element={<TipArticle />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/gift-codes" element={<GiftCodes />} />
        <Route path="/privacy" element={<PolicyPage which="privacy" />} />
        <Route path="/terms" element={<PolicyPage which="terms" />} />
        <Route path="/community-guidelines" element={<PolicyPage which="guidelines" />} />
        <Route path="/copyright" element={<PolicyPage which="copyright" />} />
      </Route>

      {/* Admin area — direct access, no login required */}
      <Route element={<AdminLayout />}>
        <Route path="/spballiancehubadministrator2026" element={<AdminDashboard />} />
        <Route path="/spballiancehubadministrator2026/home" element={<AdminHome />} />
        <Route path="/spballiancehubadministrator2026/members" element={<AdminMembers />} />
        <Route path="/spballiancehubadministrator2026/news" element={<AdminNews />} />
        <Route path="/spballiancehubadministrator2026/tips" element={<AdminTips />} />
        <Route path="/spballiancehubadministrator2026/events" element={<AdminEvents />} />
        <Route path="/spballiancehubadministrator2026/leaderboard" element={<AdminLeaderboard />} />
        <Route path="/spballiancehubadministrator2026/announcements" element={<AdminAnnouncements />} />
        <Route path="/spballiancehubadministrator2026/gifs" element={<Navigate to="/spballiancehubadministrator2026" replace />} />
        <Route path="/spballiancehubadministrator2026/gift-codes" element={<AdminGifts />} />
        <Route path="/spballiancehubadministrator2026/chat" element={<Navigate to="/spballiancehubadministrator2026" replace />} />
        <Route path="/spballiancehubadministrator2026/media" element={<AdminMedia />} />
        <Route path="/spballiancehubadministrator2026/social" element={<AdminSocial />} />
        <Route path="/spballiancehubadministrator2026/settings" element={<AdminSettings />} />
        <Route path="/spballiancehubadministrator2026/admins" element={<AdminAdmins />} />
        <Route path="/spballiancehubadministrator2026/activity" element={<AdminActivity />} />
        <Route path="/spballiancehubadministrator2026/profile" element={<AdminProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
  );
}
