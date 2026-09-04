import React from 'react';
import { Link } from 'react-router-dom';
import Emblem from './Emblem.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { IconDiscord, IconYouTube, IconMail } from './icons.jsx';

export default function Footer() {
  const { settings } = useAuth();
  const year = new Date().getFullYear();
  // Admin can override via Site Settings → contact email; the address below
  // is the alliance inbox used until then.
  const mail = settings?.contact_email || 'spb.alliance.hub@gmail.com';

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              {settings?.logo ? (
                <img src={settings.logo} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'contain' }} />
              ) : (
                <Emblem size={30} />
              )}
              <span className="brand-name">
                {(settings?.alliance_name || 'SPB Alliance').toUpperCase()} <b>HUB</b>
              </span>
            </div>
            <p className="footer-tag">
              {settings?.tagline || 'Your Alliance Command Center'} — private to verified alliance members.
            </p>
            <nav className="footer-legal" aria-label="Policies and legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/community-guidelines">Community Guidelines</Link>
              <Link to="/copyright">Copyright / IP Policy</Link>
            </nav>
          </div>

          <div className="footer-social">
            <div className="footer-social-row">
              {settings?.discord_url ? (
                <a className="social-btn" href={settings.discord_url} target="_blank" rel="noopener noreferrer" aria-label="Discord">
                  <IconDiscord />
                </a>
              ) : null}
              {settings?.youtube_url ? (
                <a className="social-btn" href={settings.youtube_url} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <IconYouTube />
                </a>
              ) : null}
            </div>
            <a className="footer-mail" href={`mailto:${mail}`}>
              <IconMail />
              <span>Mail Us: {mail}</span>
            </a>
          </div>
        </div>

        <div className="footer-copy">
          <span>{settings?.footer_text || `© ${year} ${settings?.alliance_name || 'SPB Alliance'}. For alliance members only.`}</span>
          <span className="mono">
            {settings?.contact_email ? `Contact: ${settings.contact_email} · ` : ''}
            {settings?.alliance_rank ? `Rank: ${settings.alliance_rank} · ` : ''}
            All times shown in UTC
          </span>
        </div>
      </div>
    </footer>
  );
}
