import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'img'];
const ALLOWED_ATTR = ['style', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height'];

// Renders admin-authored rich text (news body, tips body, event/announcement
// text, etc). The value is already sanitized server-side before it's ever
// stored, but this sanitizes again on the way to the DOM — defense in depth
// costs nothing here and protects against any content saved before this
// feature existed or written directly to the database.
//
// Legacy content saved before rich text existed is plain text with
// paragraphs separated by a blank line — if we detect no HTML tags at all,
// fall back to the old paragraph-split rendering instead of dumping it out
// as one unbroken block.
export default function RichContent({ html, className = '', style }) {
  const clean = useMemo(() => {
    const raw = html || '';
    if (!/<[a-z][\s\S]*>/i.test(raw)) return null; // legacy plain text
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOWED_URI_REGEXP: /^(?:https?:)?\/\//i,
    });
  }, [html]);

  if (clean === null) {
    const raw = html || '';
    return (
      <div className={`rich-content ${className}`.trim()} style={style}>
        {raw.split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  }

  return <div className={`rich-content ${className}`.trim()} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}
