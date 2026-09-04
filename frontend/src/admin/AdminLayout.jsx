import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
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
  { to: '/spballiancehubadministrator2026/profile', label: 'Admin Profile', icon: <IconUser /> },
];

export default function AdminLayout() {
  const { logout } = useAuth();

  async function signOut() {
    await logout();
    window.location.replace('/');
  }

  return (
    <>
      <AdminHeader />
      <nav className="admin-nav" aria-label="Admin navigation">
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
