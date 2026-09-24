import React from 'react';
import { IconTower } from './icons.jsx';
import tg1 from '../assets/tg-1.png';
import tg2 from '../assets/tg-2.png';
import tg3 from '../assets/tg-3.png';
import tg4 from '../assets/tg-4.png';
import tg5 from '../assets/tg-5.png';
import tg6 from '../assets/tg-6.png';
import tg7 from '../assets/tg-7.png';
import tg8 from '../assets/tg-8.png';

const TG_BADGES = [tg1, tg2, tg3, tg4, tg5, tg6, tg7, tg8];

// Matches the game's own convention exactly: Town Center levels 1–30 show as
// plain "Lv. XX" text; past level 30, Truegold tiers show the game's own
// TG1–TG8 badge icon instead of a number (the tier cap rises with kingdom
// age, currently up to TG8 kingdom-wide, TG10 on the oldest servers).
export default function TownCenterBadge({ level, size = 20, className = '' }) {
  const n = Number(level);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n > 30) {
    const tier = Math.min(n - 30, TG_BADGES.length);
    const src = TG_BADGES[tier - 1];
    return (
      <span className={`tc-badge ${className}`.trim()} title={`Town Center — Truegold ${tier}`}>
        <IconTower className="tc-badge-icon" style={{ width: size, height: size }} />
        <img src={src} alt={`TG${tier}`} className="tc-badge-tg" style={{ width: size, height: size }} />
      </span>
    );
  }

  return (
    <span className={`tc-badge ${className}`.trim()} title="Town Center level">
      <IconTower className="tc-badge-icon" style={{ width: size, height: size }} />
      <span className="tc-badge-level">Lv. {n}</span>
    </span>
  );
}
