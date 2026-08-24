import { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  X,
  Save,
  Sparkles,
  Loader2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Tag as TagIcon,
  Plus,
} from 'lucide-react';
import ErrorBanner from './ErrorBanner';

function NoteEditorForm({
  initialNote,
  initialTags = [],
  onSave,
  onCancel,
  isSaving,
  externalError,
}) {
  const isEditMode = Boolean(initialNote && initialNote._id);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [tags, setTags] = useState(
    initialNote?.tags || initialTags || []
  );
  const [tagInput, setTagInput] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [activeStyles, setActiveStyles] = useState({
    bold: false,
    italic: false,
    h1: false,
    h2: false,
    ul: false,
    ol: false,
  });

  const titleInputRef = useRef(null);
  const editorRef = useRef(null);

  // Synchronize initial tags
  useEffect(() => {
    if (initialNote?.tags && initialNote.tags.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTags(initialNote.tags);
    } else if (initialTags && initialTags.length > 0) {
      setTags(initialTags);
    }
  }, [initialNote, initialTags]);

  // Update word & character count from innerText
  const updateCounts = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.replace(/\r?\n/g, '').length;
    setCounts({ words, chars });
  }, []);

  // Update active state of toolbar buttons based on current selection
  const updateToolbarState = useCallback(() => {
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUl = document.queryCommandState('insertUnorderedList');
      const isOl = document.queryCommandState('insertOrderedList');
      const block = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      const isH1 = block === 'h1' || block === '<h1>';
      const isH2 = block === 'h2' || block === '<h2>';

      setActiveStyles({
        bold: isBold,
        italic: isItalic,
        h1: isH1,
        h2: isH2,
        ul: isUl,
        ol: isOl,
      });
    } catch {
      // Ignore formatting state errors
    }
  }, []);

  // Initialize content on mount
  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      // Ignore
    }
    if (editorRef.current) {
      const rawContent = initialNote?.content || '';
      editorRef.current.innerHTML = DOMPurify.sanitize(rawContent);
      updateCounts();
    }
  }, [initialNote, updateCounts]);

  // Add Tag
  const handleAddTag = (e) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (!cleanTag) return;
    if (tags.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTags([...tags, cleanTag]);
    setTagInput('');
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Tag Input KeyDown (Enter or Comma)
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Execute standard formatting commands on contentEditable canvas
  const handleExecCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    updateToolbarState();
    updateCounts();
  };

  // Format heading toggle (H1 / H2)
  const handleFormatBlock = (headingTag) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const currentBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    if (currentBlock === headingTag || currentBlock === `<${headingTag}>`) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${headingTag}>`);
    }
    updateToolbarState();
    updateCounts();
  };

  // Normalize and clean up any extraneous font color tags or inline color styles injected by browser on list breakouts / Enter
  const normalizeContentElements = useCallback(() => {
    if (!editorRef.current) return;

    // Clean font tags
    const fontTags = editorRef.current.querySelectorAll('font');
    fontTags.forEach((f) => {
      f.removeAttribute('color');
      f.removeAttribute('face');
      f.removeAttribute('size');
      if (f.style) {
        f.style.color = '';
        f.style.caretColor = '';
      }
    });

    // Remove extraneous inline colors/carets injected on breakout blocks
    const styledElements = editorRef.current.querySelectorAll('[style*="color"], [style*="caret"]');
    styledElements.forEach((el) => {
      el.style.color = '';
      el.style.caretColor = '';
    });

    // Ensure all block elements (p, div, li, span) drop any color attributes
    const blocks = editorRef.current.querySelectorAll('p, div, li, span');
    blocks.forEach((block) => {
      if (block.hasAttribute('color')) {
        block.removeAttribute('color');
      }
    });
  }, []);

  const handleInput = () => {
    if (validationError) setValidationError(null);

    normalizeContentElements();
    updateCounts();
    updateToolbarState();
  };

  const handleEditorKeyUp = (e) => {
    if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
      normalizeContentElements();
    }
    updateToolbarState();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    const innerHtml = editorRef.current ? editorRef.current.innerHTML : '';
    const innerText = editorRef.current ? editorRef.current.innerText.trim() : '';

    if (!trimmedTitle) {
      setValidationError('Please enter a note title.');
      titleInputRef.current?.focus();
      return;
    }

    if (!innerText && !innerHtml.includes('<img')) {
      setValidationError('Please enter note content.');
      editorRef.current?.focus();
      return;
    }

    onSave({
      title: trimmedTitle,
      content: innerHtml,
      tags: tags,
    });
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape' && !isSaving) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="note-editor-modal" onKeyDown={handleKeyDown}>
      {/* Top Glow Accent */}
      <div className="note-editor-top-glow" />

      {/* Modal Header */}
      <div className="note-editor-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 id="editor-dialog-title" className="note-editor-title">
              {isEditMode ? 'Edit Note' : 'Create New Note'}
            </h2>
            <p className="note-editor-subtitle">
              {isEditMode
                ? 'Update your thoughts with inline WYSIWYG formatting.'
                : 'Capture ideas and reflections with real-time rich text styling.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="note-editor-close-btn"
          aria-label="Close editor"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Display */}
      {(validationError || externalError) && (
        <div className="px-6 pt-2">
          <ErrorBanner
            message={validationError || externalError}
            onClose={() => setValidationError(null)}
          />
        </div>
      )}

      {/* Note Form */}
      <form onSubmit={handleSubmit} className="note-editor-form">
        <div className="note-editor-body">
          {/* Title Field */}
          <div className="note-editor-field">
            <label htmlFor="note-title-input" className="note-editor-label">
              Note Title
            </label>
            <input
              ref={titleInputRef}
              id="note-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Give your note a title..."
              className="note-editor-input"
              disabled={isSaving}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Tags Input Field */}
          <div className="note-editor-field">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="note-tag-input" className="note-editor-label flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Tags</span>
              </label>
              <span className="text-xs text-purple-300/60">Press Enter or comma to add</span>
            </div>

            <div className="tags-editor-container">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-chip-remove"
                    title={`Remove #${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                <input
                  id="note-tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "Add tags (e.g. work, idea, react)..." : "Add tag..."}
                  className="tag-input-field"
                  disabled={isSaving}
                  maxLength={30}
                />
                {tagInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="tag-add-btn"
                    title="Add tag"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inline WYSIWYG Content Field & Toolbar */}
          <div className="note-editor-field flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="note-editor-label">
                Content
              </label>
              <span className="note-editor-counter">
                {counts.words} {counts.words === 1 ? 'word' : 'words'} · {counts.chars} characters
              </span>
            </div>

            {/* Clean WYSIWYG Toolbar */}
            <div className="rich-toolbar" role="toolbar" aria-label="Text formatting toolbar">
              {/* Bold Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand('bold');
                }}
                className={`rich-tool-btn ${activeStyles.bold ? 'is-active' : ''}`}
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>

              {/* Italic Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand('italic');
                }}
                className={`rich-tool-btn ${activeStyles.italic ? 'is-active' : ''}`}
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>

              <div className="rich-toolbar-divider" />

              {/* Heading 1 Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormatBlock('h1');
                }}
                className={`rich-tool-btn ${activeStyles.h1 ? 'is-active' : ''}`}
                title="Heading 1"
                aria-label="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>

              {/* Heading 2 Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormatBlock('h2');
                }}
                className={`rich-tool-btn ${activeStyles.h2 ? 'is-active' : ''}`}
                title="Heading 2"
                aria-label="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>

              <div className="rich-toolbar-divider" />

              {/* Bulleted List Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand('insertUnorderedList');
                }}
                className={`rich-tool-btn ${activeStyles.ul ? 'is-active' : ''}`}
                title="Bulleted List"
                aria-label="Bulleted List"
              >
                <List className="w-4 h-4" />
              </button>

              {/* Numbered List Button */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleExecCommand('insertOrderedList');
                }}
                className={`rich-tool-btn ${activeStyles.ol ? 'is-active' : ''}`}
                title="Numbered List"
                aria-label="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            {/* True Inline WYSIWYG Editable Canvas */}
            <div
              ref={editorRef}
              contentEditable="true"
              onInput={handleInput}
              onKeyUp={handleEditorKeyUp}
              onMouseUp={updateToolbarState}
              className="note-editor-wysiwyg"
              data-placeholder="Start typing your note here... (Highlight text and use toolbar for Bold, Italics, Headings, or Lists)"
              role="textbox"
              aria-multiline="true"
              aria-label="Note content"
              tabIndex={0}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="note-editor-footer">
          <div className="note-editor-hint hidden sm:flex items-center gap-1.5 text-xs text-purple-300/60">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/30 text-[11px] font-mono text-purple-200">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/30 text-[11px] font-mono text-purple-200">
              Enter
            </kbd>
            <span>to save</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="note-editor-btn-secondary"
              id="note-editor-cancel-btn"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="note-editor-btn-primary"
              id="note-editor-save-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>{isEditMode ? 'Update Note' : 'Save Note'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NoteEditor({
  isOpen,
  initialNote,
  initialTags = [],
  onSave,
  onCancel,
  isSaving,
  externalError,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="note-editor-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-dialog-title"
    >
      <NoteEditorForm
        key={initialNote?._id || 'new-note'}
        initialNote={initialNote}
        initialTags={initialTags}
        onSave={onSave}
        onCancel={onCancel}
        isSaving={isSaving}
        externalError={externalError}
      />
    </div>
  );
}
