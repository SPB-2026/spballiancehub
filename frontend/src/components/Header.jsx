import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useUtcClock, useLocalClock } from '../hooks/useClock.js';
import { useTheme } from '../theme/theme.js';
import {
  IconMenu, IconClose, IconGlobe, IconPin, IconClock,
  IconHome, IconUsers, IconCalendar, IconBulb, IconGift,
} from './icons.jsx';

const MEMBER_NAV = [
  { to: '/', label: 'Home', end: true, icon: <IconHome />, color: '#F4D76A' },
  { to: '/members', label: 'Members', icon: <IconUsers />, color: '#5B9BD5' },
  { to: '/calendar', label: 'Calendar', icon: <IconCalendar />, color: '#D06A6A' },
  { to: '/tips', label: 'Tips', icon: <IconBulb />, color: '#F4D76A' },
  { to: '/gift-codes', label: 'Gift Codes', icon: <IconGift />, color: '#E05A5A' },
];

function NavIcon({ item }) {
  return (
    <span className="nav-icon" style={{ '--nav-c': item.color }} aria-hidden="true">
      {item.icon}
    </span>
  );
}

export default function Header() {
  const { settings } = useAuth();
  const { theme, toggle } = useTheme('member');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zone, setZone] = useState(() => {
    try { return localStorage.getItem('spb_clock_zone') === 'local' ? 'local' : 'utc'; }
    catch { return 'utc'; }
  });
  const utc = useUtcClock();
  const local = useLocalClock();

  // Clicking a zone shows that zone's time (persisted across visits).
  function selectZone(z) {
    setZone(z);
    try { localStorage.setItem('spb_clock_zone', z); } catch { /* ignore */ }
  }

  const time = zone === 'utc' ? utc : local;

  const navItems = MEMBER_NAV;

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="SPB Alliance Hub home">
            {settings?.logo ? (
              <img src={settings.logo} alt="" className="brand-logo" />
            ) : (
              <span className="brand-badge" aria-hidden="true">SPB</span>
            )}
            <span className="brand-name">
              SPB Alliance <b>Hub</b>
            </span>
          </Link>

          <button
            className="nav-toggle"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <IconClose /> : <IconMenu />}
          </button>

          <nav className="main-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${isActive ? 'active' : ''}${item.admin ? ' nav-admin' : ''}`}
              >
                <NavIcon item={item} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-right">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggle}
              aria-label={theme === 'night' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
              title={theme === 'night' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              <span className="tt-icon" aria-hidden="true">{theme === 'night' ? '☀️' : '🌙'}</span>
              <span className="tt-label">{theme === 'night' ? 'Day' : 'Night'}</span>
            </button>

            <div
              className="clock-toggle"
              role="group"
              aria-label={`Clock — showing ${zone === 'utc' ? 'UTC' : 'local'} time ${time}. Tap to switch zone.`}
              onClick={(e) => {
                // On small screens the zone buttons are hidden — tapping the
                // capsule toggles UTC ⇄ Local so the control stays usable.
                const t = e.target.closest('button');
                if (!t) selectZone(zone === 'utc' ? 'local' : 'utc');
              }}
            >
              <IconClock className="ct-clock" />
              <span className="ct-time">{time}</span>
              <span className="ct-zone-tag" aria-hidden="true">{zone === 'utc' ? 'UTC' : 'Local'}</span>
              <button
                type="button"
                className={`ct-zone-btn${zone === 'utc' ? ' active' : ''}`}
                onClick={() => selectZone('utc')}
                aria-pressed={zone === 'utc'}
                title="Show UTC time"
              >
                <IconGlobe /> UTC
              </button>
              <button
                type="button"
                className={`ct-zone-btn${zone === 'local' ? ' active' : ''}`}
                onClick={() => selectZone('local')}
                aria-pressed={zone === 'local'}
                title="Show local time"
              >
                <IconPin /> Local
              </button>
            </div>

            <div style={{ width: 8 }} aria-hidden="true" />
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <nav className="mobile-drawer open" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setDrawerOpen(false)}
            >
              <NavIcon item={item} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </>
  );
}
