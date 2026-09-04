import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useUtcClock, useLocalClock } from '../hooks/useClock.js';
import { useTheme } from '../theme/theme.js';
import { IconGlobe, IconPin, IconClock, IconShield } from '../components/icons.jsx';

// Dedicated top bar for the Admin Panel. The admin area is its own zone —
// this header shows NO member-site navigation; the command sidebar (admin-nav)
// is the only navigation surface inside the panel.
export default function AdminHeader() {
  const { user, settings } = useAuth();
  const { theme, toggle } = useTheme('admin');
  const [zone, setZone] = useState(() => {
    try { return localStorage.getItem('spb_clock_zone') === 'local' ? 'local' : 'utc'; }
    catch { return 'utc'; }
  });
  const utc = useUtcClock();
  const local = useLocalClock();

  function selectZone(z) {
    setZone(z);
    try { localStorage.setItem('spb_clock_zone', z); } catch { /* ignore */ }
  }

  const time = zone === 'utc' ? utc : local;

  return (
    <header className="site-header admin-header">
      <div className="header-inner">
        <Link to="/spballiancehubadministrator2026" className="brand" aria-label="SPB Alliance Command Center">
          {settings?.logo ? (
            <img src={settings.logo} alt="" className="brand-logo" />
          ) : (
            <span className="brand-badge" aria-hidden="true">SPB</span>
          )}
          <span className="brand-name">
            {(settings?.alliance_name || 'SPB Alliance').toUpperCase()} <b>Command</b>
          </span>
          <span className="admin-zone-badge" title="Administrator area">
            <IconShield size={11} /> ADMIN
          </span>
        </Link>

        {/* Identity stays beside the brand; the clock is pinned to the far
            right edge of the header. */}
        <div className="admin-header-left">
          <div className="user-chip">
            <div>
              <div className="user-name">{user?.name || 'Administrator'}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
        </div>

        <div className="admin-header-right">
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
        </div>
      </div>
    </header>
  );
}
