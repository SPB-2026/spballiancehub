import React, { useEffect, useRef, useState } from 'react';
import MediaPicker from './MediaPicker.jsx';
import api from '../services/api.js';

const BLOCK_TAGS = ['P', 'H2', 'H3', 'LI', 'DIV'];

function exec(command, value = null) {
  document.execCommand(command, false, value);
}

export default function RichTextEditor({ value = '', onChange }) {
  const editorRef = useRef(null);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageAlign, setImageAlign] = useState('center');

  useEffect(() => {
    if (!editorRef.current) return;

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>';
    }
  }, [value]);

  function update() {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function format(command, commandValue = null) {
    focusEditor();
    exec(command, commandValue);
    update();
  }

  function setBlock(tag) {
    focusEditor();
    exec('formatBlock', tag);
    update();
  }

  function insertLink() {
    focusEditor();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setShowLink(true);
      return;
    }

    const url = window.prompt('Enter the link URL:', 'https://');
    if (!url) return;

    exec('createLink', url);
    update();
  }

  function addImage(url) {
    if (!url) return;

    focusEditor();

    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = imageAlign === 'left'
      ? '12px 0'
      : imageAlign === 'right'
        ? '12px 0 12px auto'
        : '12px auto';

    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }

    update();
  }

async function handlePaste(e) {
  const clipboard = e.clipboardData;

  if (!clipboard) return;

  // Handle screenshots/images copied to the clipboard.
  const imageItem = Array.from(clipboard.items || []).find(
    (item) => item.type.startsWith('image/')
  );

  if (imageItem) {
    const file = imageItem.getAsFile();

    if (!file) return;

    e.preventDefault();

    try {
      const uploaded = await api.upload('/admin/media', file, 'image');
      addImage(uploaded.url);
    } catch (err) {
      console.error('Screenshot upload failed:', err);
      window.alert(`Screenshot upload failed: ${err.message}`);
    }

    return;
  }

  // Allow normal text paste.
  // The browser handles the actual insertion.
  setTimeout(update, 0);
}

    return;
  }
}

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      document.execCommand('undo');
      update();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      document.execCommand('redo');
      update();
    }
  }

  function submitLink(e) {
    e.preventDefault();

    if (!linkUrl.trim()) {
      setShowLink(false);
      return;
    }

    focusEditor();
    exec('createLink', linkUrl.trim());
    update();

    setLinkUrl('');
    setShowLink(false);
  }

  return (
    <div className="rich-editor">
      <div
        className="rich-editor-toolbar"
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: 8,
          border: '1px solid var(--border)',
          borderBottom: 0,
          borderRadius: '8px 8px 0 0',
          background: 'var(--panel)',
        }}
      >
        <ToolbarButton label="B" title="Bold" onClick={() => format('bold')} />
        <ToolbarButton label="I" title="Italic" onClick={() => format('italic')} />
        <ToolbarButton label="U" title="Underline" onClick={() => format('underline')} />

        <ToolbarDivider />

        <ToolbarButton label="H2" title="Heading 2" onClick={() => setBlock('H2')} />
        <ToolbarButton label="H3" title="Heading 3" onClick={() => setBlock('H3')} />

        <ToolbarDivider />

        <ToolbarButton label="• List" title="Bullet list" onClick={() => format('insertUnorderedList')} />
        <ToolbarButton label="1. List" title="Numbered list" onClick={() => format('insertOrderedList')} />

        <ToolbarDivider />

        <ToolbarButton label="Link" title="Insert link" onClick={insertLink} />

        <MediaPicker
          onPick={addImage}
          label="Insert image"
        />

        <ToolbarDivider />

        <ToolbarButton
          label="←"
          title="Align image left"
          onClick={() => setImageAlign('left')}
        />
        <ToolbarButton
          label="↔"
          title="Align image center"
          onClick={() => setImageAlign('center')}
        />
        <ToolbarButton
          label="→"
          title="Align image right"
          onClick={() => setImageAlign('right')}
        />

        <ToolbarDivider />

        <ToolbarButton
          label="↶"
          title="Undo"
          onClick={() => format('undo')}
        />
        <ToolbarButton
          label="↷"
          title="Redo"
          onClick={() => format('redo')}
        />
      </div>

      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={update}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onBlur={update}
        style={{
          minHeight: 320,
          padding: 16,
          border: '1px solid var(--border)',
          borderRadius: '0 0 8px 8px',
          background: 'var(--bg)',
          outline: 'none',
          lineHeight: 1.7,
        }}
      />

      {showLink ? (
        <form
          onSubmit={submitLink}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 8,
          }}
        >
          <input
            className="input"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
          />
          <button type="submit" className="btn btn-gold btn-sm">
            Add link
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowLink(false)}
          >
            Cancel
          </button>
        </form>
      ) : null}

      <div
        className="text-dim"
        style={{
          marginTop: 8,
          fontSize: 12,
        }}
      >
        Tip: You can paste a screenshot directly into the editor with Ctrl+V.
      </div>
    </div>
  );
}

function ToolbarButton({ label, title, onClick }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 1,
        height: 22,
        background: 'var(--border)',
        margin: '0 2px',
      }}
    />
  );
}
