import React from 'react';

/**
 * Lightweight Discord-style markdown renderer.
 * Supports: **bold**, *italic*, ~~strike~~, `code`, ```blocks```, ||spoiler||, @mentions, URLs
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split code blocks first (```...```)
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w*\n/, ''); // strip optional language tag
      return <pre key={i}><code>{code}</code></pre>;
    }
    return <span key={i}>{renderInline(part)}</span>;
  });
}

function renderInline(text: string): React.ReactNode[] {
  // Process inline patterns
  const patterns = [
    // Bold **text**
    { regex: /\*\*(.+?)\*\*/g, render: (m: string, k: number) => <strong key={k}>{m}</strong> },
    // Italic *text*
    { regex: /\*(.+?)\*/g, render: (m: string, k: number) => <em key={k}>{m}</em> },
    // Strikethrough ~~text~~
    { regex: /~~(.+?)~~/g, render: (m: string, k: number) => <del key={k}>{m}</del> },
    // Inline code `text`
    { regex: /`([^`]+)`/g, render: (m: string, k: number) => <code key={k}>{m}</code> },
    // Spoiler ||text||
    { regex: /\|\|(.+?)\|\|/g, render: (m: string, k: number) => (
      <span key={k} className="spoiler" onClick={(e) => e.currentTarget.classList.toggle('revealed')}>{m}</span>
    )},
    // @mention
    { regex: /@(\w+)/g, render: (m: string, k: number) => <span key={k} className="mention">@{m}</span> },
    // URL
    { regex: /(https?:\/\/[^\s<]+)/g, render: (m: string, k: number) => (
      <a key={k} href={m} target="_blank" rel="noopener noreferrer" className="text-teamer-400 hover:underline">{m}</a>
    )},
  ];

  let nodes: React.ReactNode[] = [text];

  for (const { regex, render } of patterns) {
    const next: React.ReactNode[] = [];
    let key = 0;
    for (const node of nodes) {
      if (typeof node !== 'string') { next.push(node); continue; }
      let last = 0;
      const r = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = r.exec(node)) !== null) {
        if (match.index > last) next.push(node.slice(last, match.index));
        next.push(render(match[1], key++));
        last = match.index + match[0].length;
      }
      if (last < node.length) next.push(node.slice(last));
    }
    nodes = next;
  }

  return nodes;
}
