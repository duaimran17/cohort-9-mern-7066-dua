import { render, screen } from '@testing-library/react';
import MarkdownRenderer from '../../components/MarkdownRenderer';


// Tests


describe('MarkdownRenderer — empty or null content', () => {
  it('returns null when content is empty string', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when content is null or undefined', () => {
    const { container } = render(<MarkdownRenderer content={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('MarkdownRenderer — headings', () => {
  it('renders H1, H2, H3, and H4 elements properly', () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4';
    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Heading 3' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Heading 4' })).toBeInTheDocument();
  });
});

describe('MarkdownRenderer — inline formatting', () => {
  it('renders bold, italic, bold+italic, and strikethrough tokens', () => {
    const markdown = '**Bold text** and *Italic text* and ***BoldItalic*** and ~~Strikethrough~~';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    expect(container.querySelector('strong.md-bold')).toHaveTextContent('Bold text');
    expect(container.querySelector('em.md-italic')).toHaveTextContent('Italic text');
    expect(container.querySelector('strong.md-bold.md-italic')).toHaveTextContent('BoldItalic');
    expect(container.querySelector('del.md-del')).toHaveTextContent('Strikethrough');
  });

  it('renders inline code snippet', () => {
    const markdown = 'Use `const x = 10;` in your code.';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    const inlineCode = container.querySelector('code.md-code-inline');
    expect(inlineCode).toBeInTheDocument();
    expect(inlineCode).toHaveTextContent('const x = 10;');
  });
});

describe('MarkdownRenderer — code blocks and blockquotes', () => {
  it('renders fenced code blocks with language badge', () => {
    const markdown = '```javascript\nconsole.log("hello world");\n```';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    expect(container.querySelector('.md-code-lang')).toHaveTextContent('javascript');
    expect(container.querySelector('code.md-code-block')).toHaveTextContent('console.log("hello world");');
  });

  it('renders blockquotes', () => {
    const markdown = '> This is a quoted thought.\n> Second line of quote.';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    const blockquote = container.querySelector('blockquote.md-blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent('This is a quoted thought.');
    expect(blockquote).toHaveTextContent('Second line of quote.');
  });
});

describe('MarkdownRenderer — lists and dividers', () => {
  it('renders unordered list with bullet items', () => {
    const markdown = '- First item\n- Second item\n* Third item';
    render(<MarkdownRenderer content={markdown} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('First item');
    expect(listItems[1]).toHaveTextContent('Second item');
    expect(listItems[2]).toHaveTextContent('Third item');
  });

  it('renders ordered list with numbered items', () => {
    const markdown = '1. Step one\n2. Step two';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    const ol = container.querySelector('ol.md-ol');
    expect(ol).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders horizontal rule separator', () => {
    const markdown = 'Section 1\n---\nSection 2';
    const { container } = render(<MarkdownRenderer content={markdown} />);

    expect(container.querySelector('hr.md-hr')).toBeInTheDocument();
  });
});

describe('MarkdownRenderer — security and HTML escaping', () => {
  it('does not execute or inject raw HTML strings directly into DOM as unescaped elements', () => {
    const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="alert(1)" />';
    const { container } = render(<MarkdownRenderer content={maliciousInput} />);


    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<script>alert("xss")</script><img src="x" onerror="alert(1)" />');
  });
});

describe('MarkdownRenderer — compact mode', () => {
  it('applies is-compact class when compact prop is true', () => {
    const { container } = render(<MarkdownRenderer content="# Title" compact={true} />);
    expect(container.querySelector('.markdown-body')).toHaveClass('is-compact');
    expect(container.querySelector('h1')).toHaveClass('compact');
  });
});
