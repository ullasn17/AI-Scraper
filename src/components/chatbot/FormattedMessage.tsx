'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface FormattedMessageProps {
  content: string;
  isUser?: boolean;
}

export default function FormattedMessage({ content, isUser = false }: FormattedMessageProps) {
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  // Parse markdown content into structured blocks
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2.5 text-slate-800 text-[13px] leading-relaxed break-words">
      {blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Markdown AST / Block Parser
// -------------------------------------------------------------

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code_block'; language: string; code: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'code_block',
        language: language || 'text',
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Table detection: line starts and ends with '|'
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|', 1)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // Line 0: headers
        const headers = parseTableRow(tableLines[0]);
        // Line 1: separator (check if it looks like |---|---|)
        const isSep = /^\|?(\s*:?-+:?\s*\|?)+$/.test(tableLines[1]);
        const startRow = isSep ? 2 : 1;
        const rows: string[][] = [];
        for (let r = startRow; r < tableLines.length; r++) {
          rows.push(parseTableRow(tableLines[r]));
        }
        blocks.push({ type: 'table', headers, rows });
        continue;
      } else {
        // Fallback single line with pipes -> treat as paragraph
        blocks.push({ type: 'paragraph', text: tableLines[0] });
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // Unordered List (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered List (1. 2. etc.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Regular Paragraph
    const paraLines: string[] = [rawLine];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---|___|\*\*\*)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

function parseTableRow(line: string): string[] {
  // Remove outer '|' if present
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.substring(1);
  if (clean.endsWith('|')) clean = clean.substring(0, clean.length - 1);
  return clean.split('|').map((c) => c.trim());
}

// -------------------------------------------------------------
// Block Renderers
// -------------------------------------------------------------

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      if (block.level === 1) {
        return (
          <h2 className="text-base sm:text-lg font-bold text-[#0b2545] tracking-tight mt-4 mb-2 pb-1.5 border-b border-slate-200">
            <InlineRenderer text={block.text} />
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3 className="text-sm sm:text-base font-bold text-[#0b2545] tracking-tight mt-3 mb-1.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <InlineRenderer text={block.text} />
          </h3>
        );
      }
      return (
        <h4 className="text-xs sm:text-sm font-bold text-[#0b2545] mt-2.5 mb-1 text-teal-900 flex items-center gap-1">
          <InlineRenderer text={block.text} />
        </h4>
      );

    case 'table':
      return (
        <div className="my-3 overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[#0b2545] font-bold text-[11px] uppercase tracking-wider">
                  {block.headers.map((h, idx) => (
                    <th key={idx} className="p-3 border-r last:border-r-0 border-slate-200 whitespace-nowrap">
                      <InlineRenderer text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {block.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-teal-50/20 transition-colors odd:bg-white even:bg-slate-50/50"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-3 border-r last:border-r-0 border-slate-100 align-top leading-relaxed text-slate-700"
                      >
                        <InlineRenderer text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'code_block':
      return <CodeBlockRenderer language={block.language} code={block.code} />;

    case 'blockquote':
      return (
        <div className="my-2.5 border-l-4 border-[#0d9488] bg-teal-50/60 py-2 px-3 rounded-r-lg text-xs text-slate-700 italic leading-relaxed">
          <InlineRenderer text={block.text} />
        </div>
      );

    case 'list':
      if (block.ordered) {
        return (
          <ol className="my-2 space-y-1.5 pl-0.5">
            {block.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-teal-100/80 text-[#0d9488] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <InlineRenderer text={item} />
                </div>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-2 space-y-1.5 pl-0.5">
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0 mt-2"></span>
              <div className="flex-1">
                <InlineRenderer text={item} />
              </div>
            </li>
          ))}
        </ul>
      );

    case 'hr':
      return <hr className="my-3 border-slate-200" />;

    case 'paragraph':
      return (
        <p className="my-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-700">
          <InlineRenderer text={block.text} />
        </p>
      );

    default:
      return null;
  }
}

// -------------------------------------------------------------
// Code Block with Copy
// -------------------------------------------------------------

function CodeBlockRenderer({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 overflow-hidden shadow-sm">
      <div className="px-3.5 py-1.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed text-emerald-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// -------------------------------------------------------------
// Inline Formatter (Bold, Italic, Links, Code, Tags)
// -------------------------------------------------------------

function InlineRenderer({ text }: { text: string }) {
  // Normalize HTML breaks like <br>, <br/>, <br >, &lt;br&gt;, &lt;br/&gt; to real newlines
  const normalized = text.replace(/(&lt;|<)br\s*\/?(&gt;|>)/gi, '\n');
  const lines = normalized.split(/\r?\n/);
  return (
    <>
      {lines.map((subLine, lIdx) => (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && <br className="my-0.5" />}
          {renderInlineTokens(subLine)}
        </React.Fragment>
      ))}
    </>
  );
}

function renderInlineTokens(line: string): React.ReactNode[] {
  // Tokenizer pattern for:
  // 1. Links: [text](url)
  // 2. Inline Code: `code`
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Date badges: (e.g. 2026-12-10 or Last Date: ...)
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      nodes.push(line.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];

    // Markdown Link: [text](url)
    if (fullMatch.startsWith('[') && match[2] && match[3]) {
      const linkText = match[2];
      const linkUrl = match[3];
      nodes.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0d9488] hover:text-[#0b2545] font-semibold underline inline-flex items-center gap-0.5 transition-colors"
        >
          <span>{linkText}</span>
          <ExternalLink className="w-3 h-3 inline shrink-0" />
        </a>
      );
    }
    // Inline Code: `code`
    else if (fullMatch.startsWith('`') && match[4]) {
      nodes.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-[#0d9488] font-mono text-[11px] border border-slate-200 font-semibold"
        >
          {match[4]}
        </code>
      );
    }
    // Bold: **text**
    else if (fullMatch.startsWith('**') && match[5]) {
      nodes.push(
        <strong key={match.index} className="font-bold text-[#0b2545]">
          {match[5]}
        </strong>
      );
    }
    // Italic: *text*
    else if (fullMatch.startsWith('*') && match[6]) {
      nodes.push(
        <em key={match.index} className="italic text-slate-700">
          {match[6]}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Trailing text
  if (lastIndex < line.length) {
    nodes.push(line.substring(lastIndex));
  }

  return nodes.length > 0 ? nodes : [line];
}
