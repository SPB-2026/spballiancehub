import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import AdminHeader from './AdminHeader.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  IconDashboard, IconHome, IconUsers, IconTrophy, IconCalendar, IconNews,
  IconBook, IconGift, IconShield, IconClock, IconLink, IconSettings,
  IconLogout, IconImage, IconMegaphone, IconUser,
} from '../components/icons.jsx';

const NAV = [
  { to: '/spballiancehubadministrator2026', label: 'Dashboard', icon: <IconDashboard />, end: true },
  { to: '/spballiancehubadministrator2026/home', label: 'Home Page', icon: <IconHome /> },
  { to: '/spballiancehubadministrator2026/members', label: 'Members', icon: <IconUsers /> },
  { to: '/spballiancehubadministrator2026/news', label: 'News', icon: <IconNews /> },
  { to: '/spballiancehubadministrator2026/tips', label: 'Tips & Tricks', icon: <IconBook /> },
  { to: '/spballiancehubadministrator2026/events', label: 'Events & Calendar', icon: <IconCalendar /> },
  { to: '/spballiancehubadministrator2026/leaderboard', label: 'Leaderboard', icon: <IconTrophy /> },
  { to: '/spballiancehubadministrator2026/announcements', label: 'Announcements', icon: <IconMegaphone /> },
  { to: '/spballiancehubadministrator2026/gift-codes', label: 'Gift Codes', icon: <IconGift /> },
  { to: '/spballiancehubadministrator2026/media', label: 'Media Library', icon: <IconImage /> },
  { to: '/spballiancehubadministrator2026/social', label: 'Social Links', icon: <IconLink /> },
  { to: '/spballiancehubadministrator2026/settings', label: 'Site Settings', icon: <IconSettings /> },
  { to: '/spballiancehubadministrator2026/admins', label: 'Admin Accounts', icon: <IconShield /> },
  { to: '/spballiancehubadministrator2026/activity', label: 'Activity Log', icon: <IconClock /> },
  { to: '/spballiancehubadministrator2026/resources', label: 'Resources', icon: <IconLink /> },
  { to: '/spballiancehubadministrator2026/access-log', label: 'Access Log', icon: <IconLink /> },
  { to: '/spballiancehubadministrator2026/profile', label: 'Admin Profile', icon: <IconUser /> },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  // Phone-size menu: opened from a button in the header, closed again as soon
  // as a page is picked (or the dimmed area outside it is tapped).
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function signOut() {
    await logout();
    window.location.replace('/');
  }

  return (
    <>
      <AdminHeader menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((o) => !o)} />
      {menuOpen ? <div className="admin-nav-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
      <nav className={`admin-nav${menuOpen ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="admin-nav-label">Command</div>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div className="admin-nav-label" style={{ marginTop: 10 }}>Session</div>
        <button type="button" className="admin-nav-logout" onClick={signOut}>
          <span className="nav-icon" aria-hidden="true"><IconLogout /></span>
          Log out
        </button>
      </nav>
      <main className="admin-main">
        <div className="admin-main-narrow">
          <Outlet />
        </div>
      </main>
    </>
  );
}
