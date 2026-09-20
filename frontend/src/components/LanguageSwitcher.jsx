import React, { useEffect, useRef } from 'react';
import { IconGlobe } from './icons.jsx';

// One-click page translation using Google's free "Website Translator" widget.
// This is intentionally NOT a custom translation system — it hands the whole
// page to Google's translation engine, the same one built into Chrome/Edge's
// "Translate this page" feature. Machine-translation quality (fine for
// getting the gist, occasionally awkward on gaming-specific terms), but it
// covers everything on the page — nav labels AND admin-written News/Tips/
// Event content — with no ongoing maintenance.
//
// Google's script injects its own <select> control into the container div
// below; we restyle that select to match the site and hide Google's default
// branding/banner, but the dropdown itself and the translation are Google's.
let scriptLoading = false;

export default function LanguageSwitcher() {
  const containerRef = useRef(null);

  useEffect(() => {
    function init() {
      if (!window.google?.translate?.TranslateElement || !containerRef.current) return;
      // Avoid re-initializing if this effect ever ran twice (e.g. React
      // StrictMode double-invoke in development).
      if (containerRef.current.childElementCount > 0) return;
      // eslint-disable-next-line no-new
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        containerRef.current
      );
    }

    if (window.google?.translate?.TranslateElement) {
      init();
    } else {
      window.googleTranslateElementInit = init;
      if (!scriptLoading && !document.getElementById('google-translate-script')) {
        scriptLoading = true;
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // Google's widget sometimes pushes the whole page down with an inline
    // top offset on <body> when its banner frame briefly appears — force it
    // back so the site layout never jumps.
    const resetBodyOffset = () => { document.body.style.top = '0px'; };
    const interval = setInterval(resetBodyOffset, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lang-switch" title="Translate this page">
      <IconGlobe className="lang-switch-icon" aria-hidden="true" />
      <span className="lang-switch-label">Translate</span>
      <div ref={containerRef} id="google_translate_element" className="lang-switch-widget" />
    </div>
  );
}
