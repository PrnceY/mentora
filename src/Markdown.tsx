import type { ReactNode } from 'react';

/** Tiny renderer for the limited markdown the tutor emits: ##, **bold**, "- " and "1. " lists. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

export default function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const line of source.split('\n')) {
    const t = line.trim();
    const num = t.match(/^\d+\.\s+(.*)/);
    const bullet = t.match(/^[-*]\s+(.*)/);
    if (num || bullet) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((num ?? bullet)![1]);
    } else {
      flush();
      if (t.startsWith('## ')) blocks.push(<h3 key={blocks.length}>{t.slice(3)}</h3>);
      else if (t) blocks.push(<p key={blocks.length}>{inline(t)}</p>);
    }
  }
  flush();
  return <div className="md">{blocks}</div>;
}
