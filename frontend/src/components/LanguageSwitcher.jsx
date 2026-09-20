import React, { useEffect, useState } from 'react';
import { IconGlobe } from './icons.jsx';

// One-click page translation using Google's free translation engine — the
// same one behind Chrome/Edge's built-in "Translate this page". Earlier
// versions of this component showed Google's own widget UI, but that popup
// renders inside a frame Google controls, which we can't restyle — it
// looked broken and out of place.
//
// Instead: this is a fully custom dropdown (ours, styled to match the site)
// that sets Google's translation cookie directly and reloads the page.
// Google's script still does the actual translating in the background —
// it's only Google's *visible* picker UI that's replaced here.
const LANGUAGES = [
  { code: '', label: 'English (original)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'tl', label: 'Filipino' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'ur', label: 'اردو' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

function readCurrentLang() {
  const m = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/);
  return m ? m[1] : '';
}

function setLangCookie(code) {
  const host = window.location.hostname;
  const expired = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  const value = code ? `/en/${code}` : '';
  const suffix = code ? '' : expired;
  // Set/clear for both the bare host and a leading-dot domain — Google's
  // script has historically checked either form, so covering both avoids
  // a stale cookie silently winning over the one we just set.
  document.cookie = `googtrans=${value}${suffix}; path=/;`;
  document.cookie = `googtrans=${value}${suffix}; path=/; domain=${host};`;
  document.cookie = `googtrans=${value}${suffix}; path=/; domain=.${host};`;
}

let scriptRequested = false;
function ensureGoogleScriptLoaded() {
  if (window.google?.translate?.TranslateElement || scriptRequested) return;
  scriptRequested = true;
  window.googleTranslateElementInit = function initHidden() {
    const el = document.getElementById('google_translate_element_hidden');
    if (el && el.childElementCount === 0 && window.google?.translate?.TranslateElement) {
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element_hidden');
    }
  };
  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.body.appendChild(script);
}

export default function LanguageSwitcher() {
  const [lang, setLang] = useState('');

  useEffect(() => {
    setLang(readCurrentLang());
    ensureGoogleScriptLoaded();
  }, []);

  function onChange(e) {
    const code = e.target.value;
    setLangCookie(code);
    window.location.reload();
  }

  return (
    <div className="lang-switch" title="Translate this page">
      <IconGlobe className="lang-switch-icon" aria-hidden="true" />
      <select className="lang-switch-select" value={lang} onChange={onChange} aria-label="Translate this page">
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      {/* Google's engine mounts here, invisibly — it's what actually
          performs the translation once the cookie above is set; its own
          picker UI is never shown. */}
      <div id="google_translate_element_hidden" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', left: -9999, top: -9999 }} />
    </div>
  );
}
