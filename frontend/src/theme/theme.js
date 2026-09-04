import { useEffect, useRef, useState } from 'react';

/*
 * Day/Night theme — SPB Alliance Hub (Member + Admin panels only).
 *
 * - Each panel keeps an independent, persistent preference:
 *     spb-member-theme / spb-admin-theme   ("day" | "night")
 *   The active panel's preference is applied to <html data-theme="…"> so the
 *   design tokens in theme.css re-resolve across the whole panel.
 * - The applied value is mirrored to spb-theme so the inline bootstrap
 *   script in index.html can restore the right theme BEFORE first paint
 *   (no flash on reload).
 * - First visit (no stored preference) follows the OS preference
 *   (prefers-color-scheme). Once the user picks manually, the manual
 *   choice always wins.
 * - The login page is intentionally OUT OF SCOPE: theme.css re-pins the
 *   night tokens on .login-v2, and its animated sky is a self-contained
 *   canvas.
 */

const THEMES = new Set(['day', 'night']);
const APPLIED_KEY = 'spb-theme';

export function themeKey(panel) {
  return `spb-${panel}-theme`;
}

export function readStoredTheme(panel) {
  try {
    const v = localStorage.getItem(themeKey(panel));
    if (THEMES.has(v)) return v;
  } catch { /* storage unavailable */ }
  return null;
}

export function systemTheme() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'day'
      : 'night';
  } catch {
    return 'night';
  }
}

export function applyTheme(value) {
  const t = THEMES.has(value) ? value : 'night';
  try {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(APPLIED_KEY, t);
  } catch { /* ignore */ }
  return t;
}

/**
 * useTheme('member' | 'admin')
 * Returns { theme, toggle }. Applies the panel's stored preference to
 * <html> on mount; toggle() flips it, persists the panel preference and
 * enables the cross-fade class on <html> for ~380ms (see theme.css).
 */
export function useTheme(panel) {
  const [theme, setTheme] = useState(() => readStoredTheme(panel) || systemTheme());
  const fadeTimer = useRef(0);

  // Apply the stored / system preference whenever this panel mounts.
  useEffect(() => {
    applyTheme(readStoredTheme(panel) || systemTheme());
  }, [panel]);

  function toggle() {
    window.clearTimeout(fadeTimer.current);
    try {
      const root = document.documentElement;
      root.classList.add('theme-transition');
      fadeTimer.current = window.setTimeout(() => root.classList.remove('theme-transition'), 380);
    } catch { /* ignore */ }
    setTheme((t) => {
      const next = t === 'day' ? 'night' : 'day';
      try { localStorage.setItem(themeKey(panel), next); } catch { /* ignore */ }
      applyTheme(next);
      return next;
    });
  }

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  return { theme, toggle };
}
