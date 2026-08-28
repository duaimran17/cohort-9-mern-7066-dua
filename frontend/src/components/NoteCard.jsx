import DOMPurify from 'dompurify';
import { Edit3, Trash2, Clock, RotateCcw, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { getRetentionTimeLeft } from '../utils/notesStorage';
import '../styles/NoteCard.css';

/**
 * Formats ISO date string into a friendly, human-readable format
 * @param {string} dateString
 * @returns {string}
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Prepares HTML content for rich card display, gracefully handling legacy raw text or markdown
 * @param {string} content
 * @returns {string}
 */
const renderNoteHtml = (content) => {
  if (!content) return '';
  const trimmed = content.trim();

  // If already contains HTML markup, return it directly for rich native rendering
  if (/<(p|div|b|strong|i|em|h1|h2|h3|ul|ol|li|br|span|blockquote)[^>]*>/i.test(trimmed)) {
    return trimmed;
  }

  // Fallback conversion for legacy markdown or raw text
  return trimmed
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
};

export default function NoteCard({
  note,
  tags = [],
  onEdit,
  onDelete,
  isTrashMode = false,
  onRestore,
  onPermanentDelete,
  onTagClick,
}) {
  const noteTags = note.tags || tags || [];
  const formattedDate = formatDate(note.updatedAt || note.createdAt);
  const retentionTime = isTrashMode ? getRetentionTimeLeft(note.deletedAt) : null;
  const rawHtml = renderNoteHtml(note.content);
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);

  const handleCardClick = (e) => {
    if (isTrashMode) return;
    if (e.target.closest('button, a, input, textarea')) return;
    onEdit?.(note);
  };

  return (
    <article
      className={`note-card group ${isTrashMode ? 'is-trashed' : ''}`}
      onClick={handleCardClick}
    >
      {/* Top Accent Gradient Border */}
      <div className={`note-card-top-accent ${isTrashMode ? 'accent-trash' : ''}`} />

      {/* Note Header */}
      <div className="note-card-header">
        <h3 className="note-card-title">
          {isTrashMode ? (
            <span title={note.title}>{note.title}</span>
          ) : (
            <button
              type="button"
              onClick={() => onEdit?.(note)}
              className="text-left bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer hover:text-purple-300 transition-colors w-full"
              title={`Open note: ${note.title}`}
              aria-label={`Open note: ${note.title}`}
            >
              {note.title}
            </button>
          )}
        </h3>

        <div className="note-card-actions">
          {isTrashMode ? (
            <>
              {/* Restore Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore?.(note);
                }}
                className="note-action-btn restore"
                title="Restore note to active workspace"
                aria-label={`Restore ${note.title}`}
              >
                <RotateCcw className="w-4 h-4 text-emerald-300" />
              </button>

              {/* Permanent Delete Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPermanentDelete?.(note);
                }}
                className="note-action-btn delete"
                title="Permanently delete note"
                aria-label={`Permanently delete ${note.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Edit Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(note);
                }}
                className="note-action-btn edit"
                title="Edit note"
                aria-label={`Edit ${note.title}`}
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* Move to Trash Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(note);
                }}
                className="note-action-btn delete"
                title="Move to trash"
                aria-label={`Move ${note.title} to trash`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Note Content Preview (Rich HTML Rendering) */}
      <div className="note-card-content">
        <div
          className="note-card-html-preview"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>

      {/* Tags List on Card */}
      {noteTags.length > 0 && (
        <div className="note-card-tags">
          {noteTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="note-tag-pill"
              title={`Filter notes with #${tag}`}
            >
              <TagIcon className="w-2.5 h-2.5 opacity-70" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Note Footer */}
      <div className="note-card-footer">
        {isTrashMode ? (
          <div className="note-card-meta text-amber-300/80" title="Auto-purges after 7 days in trash">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{retentionTime}</span>
          </div>
        ) : (
          <div className="note-card-meta">
            <Clock className="w-3.5 h-3.5 text-violet-400/70" />
            <span>{formattedDate || 'Just now'}</span>
          </div>
        )}
      </div>
    </article>
  );
}
