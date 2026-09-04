// Original SPB Alliance crest: shield + crown + crossed swords + star + SPB monogram.
// 100% original vector art — no game assets used.
import React from 'react';

export default function Emblem({ size, className = '', title = 'SPB Alliance emblem' }) {
  return (
    <svg
      {...(size ? { width: size, height: size } : {})}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
    >
      <defs>
        <linearGradient id="spbGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4D76A" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#B8942E" />
        </linearGradient>
        <linearGradient id="spbShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#172D46" />
          <stop offset="1" stopColor="#0B1728" />
        </linearGradient>
      </defs>

      {/* Shield body */}
      <path
        d="M60 14 L98 26 V62 C98 82 82 96 60 106 C38 96 22 82 22 62 V26 Z"
        fill="url(#spbShield)"
        stroke="url(#spbGold)"
        strokeWidth="3"
      />
      <path
        d="M60 21 L92 31 V61 C92 78 79 90 60 99 C41 90 28 78 28 61 V31 Z"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="0.8"
        opacity="0.45"
      />

      {/* Crossed swords */}
      <g stroke="url(#spbGold)" strokeWidth="2.6" strokeLinecap="round">
        <path d="M38 78 L82 34" />
        <path d="M82 78 L38 34" />
      </g>
      <g stroke="#F4D76A" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
        <path d="M34 74 L42 82" />
        <path d="M86 74 L78 82" />
      </g>

      {/* Center star */}
      <path
        d="M60 44 L63.2 53.2 L72 54 L65.2 60.2 L67.2 69 L60 64.4 L52.8 69 L54.8 60.2 L48 54 L56.8 53.2 Z"
        fill="#F4D76A"
        stroke="#B8942E"
        strokeWidth="0.6"
      />

      {/* Crown */}
      <path
        d="M46 30 L50 22 L55 27 L60 19 L65 27 L70 22 L74 30 Z"
        fill="url(#spbGold)"
        stroke="#B8942E"
        strokeWidth="0.8"
      />

      {/* Monogram */}
      <text
        x="60"
        y="88"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="14"
        letterSpacing="3"
        fill="#F4D76A"
      >
        SPB
      </text>
    </svg>
  );
}
