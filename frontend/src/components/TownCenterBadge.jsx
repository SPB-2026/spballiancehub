import React from 'react';
import { IconTower } from './icons.jsx';
import { getTownCenterInfo } from '../utils/townCenter.js';
import tg1 from '../assets/tg-1.png';
import tg2 from '../assets/tg-2.png';
import tg3 from '../assets/tg-3.png';
import tg4 from '../assets/tg-4.png';
import tg5 from '../assets/tg-5.png';
import tg6 from '../assets/tg-6.png';
import tg7 from '../assets/tg-7.png';
import tg8 from '../assets/tg-8.png';

const TG_BADGES = [tg1, tg2, tg3, tg4, tg5, tg6, tg7, tg8];

// Matches the game's own convention exactly (see utils/townCenter.js for the
// confirmed raw-level → display conversion): plain level number up to 30,
// then the game's own TG badge icon for Truegold tiers. Tiers beyond the
// icon set we have (rare — only the oldest servers reach it) fall back to
// plain "TG9"/"TG10" text rather than showing a wrong icon.
export default function TownCenterBadge({ level, size = 28, className = '' }) {
  const info = getTownCenterInfo(level);
  if (!info) return null;

  if (info.kind === 'tg') {
    const src = TG_BADGES[info.tier - 1];
    return (
      <span className={`tc-badge ${className}`.trim()} title={`Town Center — Truegold ${info.tier}`}>
        {src ? (
          <img src={src} alt={`TG${info.tier}`} className="tc-badge-tg" style={{ width: size, height: size }} />
        ) : (
          <>
            <IconTower className="tc-badge-icon" style={{ width: size, height: size }} />
            <span className="tc-badge-level">TG{info.tier}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <span className={`tc-badge ${className}`.trim()} title="Town Center level">
      <IconTower className="tc-badge-icon" style={{ width: size, height: size }} />
      <span className="tc-badge-level">Lv. {info.level}</span>
    </span>
  );
}
