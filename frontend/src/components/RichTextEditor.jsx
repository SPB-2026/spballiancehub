import React, { useEffect, useRef, useState } from 'react';
import { MediaPickerModal } from './MediaPicker.jsx';
import { IconImage } from './icons.jsx';

// Preset swatches matching the site's own theme tokens (see global.css :root).
const SWATCHES = [
  { label: 'Default', value: '' },
  { label: 'Gold', value: '#d4af37' },
  { label: 'Green', value: '#4caf7d' },
  { label: 'Red', value: '#d06a6a' },
  { label: 'Orange', value: '#d99a4e' },
  { label: 'Blue', value: '#5b9bd5' },
  { label: 'Violet', value: '#6d5bd0' },
];

// Older content was saved as plain text (paragraphs separated by a blank
// line, per the old "Separate paragraphs with a blank line" hint). If what
// we're loading has no HTML tags in it, convert it to real <p> markup so
// existing articles still look right the first time they're reopened here.
export function toEditableHtml(raw) {
  const s = raw || '';
  if (/<[a-z][\s\S]*>/i.test(s)) return s;
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paras = esc.split(/\n\n+/).filter((p) => p.trim() !== '');
  if (paras.length === 0) return '';
  return paras.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// Rich text editor. Uncontrolled by design (value is only used to seed the
// initial content) — the admin forms that use this always mount a fresh
// instance per edit session (new item / different item = new Modal), so
// there's no need to sync external updates back into the DOM on every
// keystroke, which is what causes cursor-jump bugs in contentEditable.
export default function RichTextEditor({ value, onChange, minHeight = 130, maxLength = 20000, placeholder = 'Write here…' }) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = toEditableHtml(value);
      setCount((editorRef.current.innerText || '').trim().length);
    }
    // Intentionally mount-only — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    setCount((editorRef.current.innerText || '').trim().length);
  }

  function exec(cmd, val = null) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  }

  function applyColor(color) {
    editorRef.current?.focus();
    document.execCommand(color ? 'foreColor' : 'removeFormat', false, color || null);
    emit();
  }

  // The image-library modal steals focus/selection, so the current cursor
  // position has to be captured before it opens and restored before insert.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function insertImage(url) {
    setPickerOpen(false);
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange.current) sel.addRange(savedRange.current);
    document.execCommand('insertImage', false, url);
    el.querySelectorAll('img:not([style])').forEach((img) => { img.style.maxWidth = '100%'; });
    emit();
  }

  function onKeyDown(e) {
    const plain = (editorRef.current?.innerText || '');
    const isTyping = e.key.length === 1 || e.key === 'Enter';
    if (isTyping && plain.length >= maxLength && window.getSelection()?.isCollapsed) {
      e.preventDefault();
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" className="rte-btn" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" className="rte-btn" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" className="rte-btn" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}><u>U</u></button>
        <div className="rte-sep" aria-hidden="true" />
        <button type="button" className="rte-btn" title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>≡</button>
        <div className="rte-sep" aria-hidden="true" />
        {SWATCHES.map((s) => (
          <button
            key={s.label}
            type="button"
            title={s.label}
            className="rte-swatch"
            style={{ background: s.value || 'var(--text-1)' }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyColor(s.value)}
          />
        ))}
        <input
          type="color"
          className="rte-color-custom"
          title="Custom color"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => applyColor(e.target.value)}
        />
        <div className="rte-sep" aria-hidden="true" />
        <button
          type="button"
          className="rte-btn"
          title="Insert image"
          onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
          onClick={() => setPickerOpen(true)}
        >
          <IconImage />
        </button>
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={onKeyDown}
      />
      <div className="rte-count">{count.toLocaleString()} / {maxLength.toLocaleString()}</div>
      {pickerOpen ? (
        <MediaPickerModal initial="" onClose={() => setPickerOpen(false)} onPick={insertImage} />
      ) : null}
    </div>
  );
}
