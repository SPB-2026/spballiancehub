import React from 'react';
import { initials } from '../utils/format.js';

export default function Avatar({ src, name = '?', size = 34, className = '' }) {
  if (src) {
    return (
      <img
        className={`avatar ${className}`}
        src={src}
        alt={`Profile picture of ${name}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`avatar-fallback ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={`Avatar of ${name}`}
      role="img"
    >
      {initials(name)}
    </span>
  );
}
