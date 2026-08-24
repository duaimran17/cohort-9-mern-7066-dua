import { useState, useMemo, useEffect } from 'react';
import { Download, X, CheckSquare, Square, Search, CheckCircle2, FileText } from 'lucide-react';

export default function ExportModal({
  isOpen,
  notes = [],
  tagsMap = {},
  onExport,
  onCancel,
}) {
  const [exportMode, setExportMode] = useState('all'); // 'all' | 'custom'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Reset or initialize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setExportMode('all');
      setSelectedIds(new Set(notes.map((n) => n._id)));
      setSearchQuery('');
    }
  }, [isOpen, notes]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((n) => {
      const tags = n.tags || tagsMap[n._id] || [];
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [notes, tagsMap, searchQuery]);

  const toggleSelectNote = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(notes.map((n) => n._id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmExport = () => {
    let notesToExport = [];
    if (exportMode === 'all') {
      notesToExport = notes;
    } else {
      notesToExport = notes.filter((n) => selectedIds.has(n._id));
    }
    onExport(notesToExport);
  };

  if (!isOpen) return null;

  const countToExport = exportMode === 'all' ? notes.length : selectedIds.size;

  return (
    <div
      className="note-editor-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div className="export-modal-container">
        {/* Top Glow */}
        <div className="export-modal-top-glow" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 id="export-dialog-title" className="text-xl font-bold font-['Outfit'] text-white">
                Export Notes
              </h2>
              <p className="text-xs text-purple-200/70">
                Backup and download your notes as a JSON file
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="note-editor-close-btn"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Mode Selection */}
        <div className="export-options-group mb-4">
          {/* Option 1: All Notes */}
          <label
            className={`export-option-card ${exportMode === 'all' ? 'is-selected' : ''}`}
            onClick={() => setExportMode('all')}
          >
            <div className="flex items-center gap-3">
              <div className={`export-radio-circle ${exportMode === 'all' ? 'is-active' : ''}`}>
                {exportMode === 'all' && <div className="export-radio-inner" />}
              </div>
              <div>
                <div className="export-option-title">Export All Notes</div>
                <div className="export-option-sub">
                  Download all {notes.length} {notes.length === 1 ? 'note' : 'notes'} in your workspace
                </div>
              </div>
            </div>
          </label>

          {/* Option 2: Custom Multi-Select */}
          <label
            className={`export-option-card ${exportMode === 'custom' ? 'is-selected' : ''}`}
            onClick={() => setExportMode('custom')}
          >
            <div className="flex items-center gap-3">
              <div className={`export-radio-circle ${exportMode === 'custom' ? 'is-active' : ''}`}>
                {exportMode === 'custom' && <div className="export-radio-inner" />}
              </div>
              <div>
                <div className="export-option-title">Select Notes to Export</div>
                <div className="export-option-sub">
                  Choose specific notes to include in your JSON backup
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* Custom Multi-Select List Section */}
        {exportMode === 'custom' && (
          <div className="export-custom-selection-box mb-4">
            <div className="export-selection-toolbar">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter notes..."
                  className="export-search-input"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="export-quick-select-btn"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="export-quick-select-btn"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Note items scroll area */}
            <div className="export-notes-list">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-6 text-xs text-purple-300/50">
                  No notes match your filter.
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const isChecked = selectedIds.has(note._id);
                  const noteTags = note.tags || tagsMap[note._id] || [];
                  return (
                    <div
                      key={note._id}
                      onClick={() => toggleSelectNote(note._id)}
                      className={`export-note-row ${isChecked ? 'is-checked' : ''}`}
                    >
                      <div className="export-checkbox-box shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-purple-300/40" />
                        )}
                      </div>
                      <div className="export-note-info flex-1 min-w-0">
                        <div className="export-note-title" title={note.title}>
                          {note.title}
                        </div>
                        {noteTags.length > 0 && (
                          <div className="export-note-tags">
                            {noteTags.slice(0, 3).map((tag) => (
                              <span key={tag} className="export-tag-mini">
                                #{tag}
                              </span>
                            ))}
                            {noteTags.length > 3 && (
                              <span className="export-tag-mini">+{noteTags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="export-selection-footer">
              <span>
                Selected <strong>{selectedIds.size}</strong> of {notes.length} notes
              </span>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="note-editor-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmExport}
            disabled={countToExport === 0}
            className="export-confirm-btn"
          >
            <Download className="w-4 h-4" />
            <span>Export {countToExport} {countToExport === 1 ? 'Note' : 'Notes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
