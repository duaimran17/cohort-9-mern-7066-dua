/**
 * Parses inline markdown tokens: bold, italic, code, strikethrough
 * @param {string} text
 * @returns {React.ReactNode[]}
 */
function parseInlineMarkdown(text) {
  if (!text) return [];

  // Match:
  // 1. Inline code: `...`
  // 2. Bold + Italic: ***...*** or ___...___
  // 3. Bold: **...** or __...__
  // 4. Italic: *...* or _..._ (word-bounded)
  // 5. Strikethrough: ~~...~~
  const tokenRegex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|\b_[^_]+_\b|~~[^~]+~~)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="md-code-inline">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold + Italic
    if (
      (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
      (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
    ) {
      return (
        <strong key={index} className="md-bold md-italic font-bold italic text-purple-200">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} className="md-bold font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} className="md-italic italic text-purple-200/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="md-del line-through opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }

    return part;
  });
}

/**
 * Parses block-level markdown into React elements
 * @param {string} content
 * @param {boolean} [compact=false]
 * @returns {React.ReactNode}
 */
export default function MarkdownRenderer({ content = '', compact = false }) {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`code-${elements.length}`} className="md-code-block-container my-2">
          {lang && <div className="md-code-lang">{lang}</div>}
          <pre className="md-pre">
            <code className="md-code-block">{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Headings (#, ##, ###, ####)
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className={`md-h1 ${compact ? 'compact' : ''}`}>
          {parseInlineMarkdown(h1Match[1])}
        </h1>
      );
      i++;
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className={`md-h2 ${compact ? 'compact' : ''}`}>
          {parseInlineMarkdown(h2Match[1])}
        </h2>
      );
      i++;
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className={`md-h3 ${compact ? 'compact' : ''}`}>
          {parseInlineMarkdown(h3Match[1])}
        </h3>
      );
      i++;
      continue;
    }

    const h4Match = line.match(/^####\s+(.+)$/);
    if (h4Match) {
      elements.push(
        <h4 key={`h4-${elements.length}`} className={`md-h4 ${compact ? 'compact' : ''}`}>
          {parseInlineMarkdown(h4Match[1])}
        </h4>
      );
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      elements.push(<hr key={`hr-${elements.length}`} className="md-hr my-3 border-purple-500/20" />);
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (line.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${elements.length}`} className={`md-blockquote ${compact ? 'compact' : ''}`}>
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx} className="m-0">
              {parseInlineMarkdown(qLine)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered List (- item or * item)
    if (/^[-*]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${elements.length}`} className={`md-ul ${compact ? 'compact' : ''}`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="md-li">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${elements.length}`} className={`md-ol ${compact ? 'compact' : ''}`}>
          {listItems.map((item, idx) => (
            <li key={idx} className="md-li">
              {parseInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={`p-${elements.length}`} className={`md-p ${compact ? 'compact' : ''}`}>
        {parseInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className={`markdown-body ${compact ? 'is-compact' : ''}`}>{elements}</div>;
}
