import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  X,
  FileText,
  LogOut,
  Menu,
  BookOpen,
  RefreshCw,
  FolderPlus,
  Trash2,
  Tag as TagIcon,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import NoteCard from './NoteCard';
import NoteEditor from './NoteEditor';
import DeleteConfirmModal from './DeleteConfirmModal';
import ExportModal from './ExportModal';
import ErrorBanner from './ErrorBanner';
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  extractApiErrorMessage,
} from '../api/notesApi';
import { logoutUser, removeAuthData } from '../api/authApi';
import {
  loadTagsMap,
  saveNoteTags,
  removeNoteTags,
  loadTrashNotes,
  moveNoteToTrash,
  removeFromTrash,
  emptyTrashStorage,
  exportNotesToJson,
  parseImportFile,
} from '../utils/notesStorage';
import '../styles/NotesDashboard.css';

export default function AuthenticatedView({ user, token, onLogout }) {
  // Active view: 'notes' | 'trash'
  const [currentView, setCurrentView] = useState('notes');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [trashNotes, setTrashNotes] = useState([]);
  const [tagsMap, setTagsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null); // null = Create, object = Edit
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState(null);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleteMode, setDeleteMode] = useState('trash'); // 'trash' | 'permanent' | 'empty-trash'
  const [isDeleting, setIsDeleting] = useState(false);

  // Export modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // File input ref for import (.json, .txt, .md)
  const fileInputRef = useRef(null);

  // Initialize tags and trash on mount / user change
  useEffect(() => {
    if (user?._id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagsMap(loadTagsMap(user._id));
      setTrashNotes(loadTrashNotes(user._id));
    }
  }, [user]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      if (token) {
        await logoutUser(token);
      }
    } catch {
      // Clear storage regardless of network failure
    } finally {
      removeAuthData();
      setIsLoggingOut(false);
      onLogout();
    }
  }, [token, onLogout]);

  // Keep a ref to handleLogout to prevent loadNotes from re-running on callback identity changes
  const handleLogoutRef = useRef(handleLogout);
  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  const userId = user?._id;

  // Fetch notes from server and merge persistent localStorage tags
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await fetchNotes(token);
      const fetchedNotes = Array.isArray(data) ? data : [];
      
      const currentTrash = loadTrashNotes(userId);
      setTrashNotes(currentTrash);
      const trashIds = new Set(currentTrash.map((t) => t._id));

      const savedTags = loadTagsMap(userId);
      setTagsMap(savedTags);

      const activeOnly = fetchedNotes
        .filter((n) => !trashIds.has(n._id))
        .map((note) => ({
          ...note,
          tags: (Array.isArray(note.tags) && note.tags.length > 0)
            ? note.tags
            : (savedTags[note._id] || []),
        }));

      setNotes(activeOnly);
    } catch (err) {
      const errorMsg = extractApiErrorMessage(err);
      setApiError(errorMsg);
      if (err.response?.status === 401) {
        setTimeout(() => {
          handleLogoutRef.current?.();
        }, 1800);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, userId]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotes();
    }
    return () => {
      isMounted = false;
    };
  }, [loadNotes]);

  // Compute all unique tags across active notes
  const allUniqueTags = useMemo(() => {
    const tagCountMap = {};
    notes.forEach((note) => {
      const noteTags = note.tags || tagsMap[note._id] || [];
      noteTags.forEach((t) => {
        const tag = t.toLowerCase();
        tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCountMap).map(([tag, count]) => ({ tag, count }));
  }, [notes, tagsMap]);

  // Open Create Note Modal
  const handleOpenCreate = () => {
    setActiveNote(null);
    setEditorError(null);
    setIsEditorOpen(true);
    setIsSidebarOpen(false);
  };

  // Open Edit Note Modal
  const handleOpenEdit = (note) => {
    const noteWithTags = {
      ...note,
      tags: note.tags || tagsMap[note._id] || [],
    };
    setActiveNote(noteWithTags);
    setEditorError(null);
    setIsEditorOpen(true);
  };

  // Close Editor Modal
  const handleCloseEditor = () => {
    if (isSaving) return;
    setIsEditorOpen(false);
    setActiveNote(null);
    setEditorError(null);
  };

  // Save Note (Create or Update) with persistent tag sync
  const handleSaveNote = async ({ title, content, tags = [] }) => {
    setIsSaving(true);
    setEditorError(null);
    try {
      if (activeNote && activeNote._id) {
        // Update existing note
        const updated = await updateNote(activeNote._id, { title, content, tags }, token);
        saveNoteTags(updated._id, tags, user?._id);
        
        setTagsMap((prev) => ({ ...prev, [updated._id]: tags }));
        setNotes((prevNotes) =>
          prevNotes.map((n) =>
            n._id === activeNote._id ? { ...updated, tags } : n
          )
        );
      } else {
        // Create new note
        const created = await createNote({ title, content, tags }, token);
        saveNoteTags(created._id, tags, user?._id);

        setTagsMap((prev) => ({ ...prev, [created._id]: tags }));
        setNotes((prevNotes) => [{ ...created, tags }, ...prevNotes]);
      }
      setIsEditorOpen(false);
      setActiveNote(null);
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      setEditorError(msg);
      if (err.response?.status === 401) {
        setTimeout(() => handleLogout(), 1800);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Open Soft-Delete to Trash Modal
  const handleOpenTrashConfirm = (note) => {
    setNoteToDelete(note);
    setDeleteMode('trash');
    setIsDeleteOpen(true);
  };

  // Open Permanent Delete Modal
  const handleOpenPermanentDeleteConfirm = (note) => {
    setNoteToDelete(note);
    setDeleteMode('permanent');
    setIsDeleteOpen(true);
  };

  // Open Empty Trash Modal
  const handleOpenEmptyTrashConfirm = () => {
    setNoteToDelete(null);
    setDeleteMode('empty-trash');
    setIsDeleteOpen(true);
  };

  // Close Delete Confirmation Modal
  const handleCloseDelete = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    setNoteToDelete(null);
  };

  // Confirm Delete Action
  const handleConfirmDeleteAction = async () => {
    setIsDeleting(true);
    try {
      if (deleteMode === 'trash') {
        // Soft delete: move to trash
        if (!noteToDelete?._id) return;
        const currentNoteTags = noteToDelete.tags || tagsMap[noteToDelete._id] || [];
        const updatedTrash = moveNoteToTrash(noteToDelete, currentNoteTags, user?._id);
        setTrashNotes(updatedTrash);
        setNotes((prev) => prev.filter((n) => n._id !== noteToDelete._id));
        setSuccessMessage(`Moved "${noteToDelete.title}" to Trash.`);
      } else if (deleteMode === 'permanent') {
        // Permanent delete single note
        if (!noteToDelete?._id) return;
        let serverSuccess = false;
        try {
          await deleteNote(noteToDelete._id, token);
          serverSuccess = true;
        } catch (err) {
          if (err.response?.status === 404) {
            serverSuccess = true;
          } else {
            const msg = extractApiErrorMessage(err);
            setApiError(`Failed to delete "${noteToDelete.title}" on server: ${msg}`);
          }
        }

        if (serverSuccess) {
          const updatedTrash = removeFromTrash(noteToDelete._id, user?._id);
          setTrashNotes(updatedTrash);
          removeNoteTags(noteToDelete._id, user?._id);
          setTagsMap((prev) => {
            const copy = { ...prev };
            delete copy[noteToDelete._id];
            return copy;
          });
          setSuccessMessage(`Permanently deleted "${noteToDelete.title}".`);
        }
      } else if (deleteMode === 'empty-trash') {
        // Permanently delete all trash notes
        let failedCount = 0;
        let successCount = 0;
        const remainingTrash = [];

        for (const item of trashNotes) {
          let itemSuccess = false;
          try {
            await deleteNote(item._id, token);
            itemSuccess = true;
          } catch (err) {
            if (err.response?.status === 404) {
              itemSuccess = true;
            } else {
              failedCount++;
              remainingTrash.push(item);
            }
          }

          if (itemSuccess) {
            successCount++;
            removeFromTrash(item._id, user?._id);
            removeNoteTags(item._id, user?._id);
            setTagsMap((prev) => {
              const copy = { ...prev };
              delete copy[item._id];
              return copy;
            });
          }
        }

        setTrashNotes(remainingTrash);

        if (failedCount === 0) {
          emptyTrashStorage(user?._id);
          setSuccessMessage('Trash emptied successfully.');
        } else if (successCount > 0) {
          setSuccessMessage(`Emptied ${successCount} ${successCount === 1 ? 'note' : 'notes'}.`);
          setApiError(`Failed to delete ${failedCount} ${failedCount === 1 ? 'note' : 'notes'} from server.`);
        } else {
          setApiError(`Failed to empty trash on server (${failedCount} ${failedCount === 1 ? 'note' : 'notes'} failed).`);
        }
      }
      setIsDeleteOpen(false);
      setNoteToDelete(null);
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      setApiError(msg);
      setIsDeleteOpen(false);
      setNoteToDelete(null);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Restore note from trash
  const handleRestoreNote = (note) => {
    const updatedTrash = removeFromTrash(note._id, user?._id);
    setTrashNotes(updatedTrash);
    const restoredTags = note.tags || tagsMap[note._id] || [];
    setNotes((prev) => [{ ...note, tags: restoredTags }, ...prev]);
    setSuccessMessage(`Restored "${note.title}" to your notes.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Open Export Modal
  const handleOpenExportModal = () => {
    setIsExportOpen(true);
  };

  // Execute Export
  const handleConfirmExport = (notesToExport) => {
    try {
      exportNotesToJson(notesToExport, tagsMap);
      setIsExportOpen(false);
      setSuccessMessage(`Exported ${notesToExport.length} notes successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setApiError('Failed to export notes.');
    }
  };

  // Handle Import Notes Trigger
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  // Handle Import File Selection (.json, .txt, .md)
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setApiError(null);
    try {
      const parsedNotes = await parseImportFile(file);
      let importedCount = 0;
      let failedCount = 0;

      for (const item of parsedNotes) {
        try {
          const created = await createNote(
            { title: item.title, content: item.content, tags: item.tags || [] },
            token
          );
          if (item.tags && item.tags.length > 0) {
            saveNoteTags(created._id, item.tags, user?._id);
            setTagsMap((prev) => ({ ...prev, [created._id]: item.tags }));
          }
          setNotes((prev) => [{ ...created, tags: item.tags || [] }, ...prev]);
          importedCount++;
        } catch (err) {
          failedCount++;
          console.warn('Failed to import individual note:', item.title, err);
        }
      }

      if (importedCount === 0) {
        setApiError(
          `Failed to import notes${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`
        );
      } else if (failedCount > 0) {
        setSuccessMessage(
          `Imported ${importedCount} ${importedCount === 1 ? 'note' : 'notes'} (${failedCount} failed).`
        );
      } else {
        setSuccessMessage(
          `Successfully imported ${importedCount} ${importedCount === 1 ? 'note' : 'notes'}!`
        );
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setApiError(err.message || 'Failed to import notes file.');
    } finally {
      setIsLoading(false);
      // Reset input value so same file can be re-selected if desired
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Real-time client-side search & tag filtering
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sourceList = currentView === 'trash' ? trashNotes : notes;

    return sourceList.filter((note) => {
      const noteTags = note.tags || tagsMap[note._id] || [];
      
      // Tag filter
      if (selectedTag && currentView === 'notes') {
        const hasTag = noteTags.some(
          (t) => t.toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }

      // Query filter (checks title, content, and tags)
      if (query) {
        const matchesTitle = note.title?.toLowerCase().includes(query);
        const matchesContent = note.content?.toLowerCase().includes(query);
        const matchesTags = noteTags.some((t) => t.toLowerCase().includes(query));
        return matchesTitle || matchesContent || matchesTags;
      }

      return true;
    });
  }, [notes, trashNotes, tagsMap, currentView, searchQuery, selectedTag]);

  // Derived user display name
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Friend');

  return (
    <div className="notes-workspace">
      {/* Hidden file input for notes import (.json, .txt, .md) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,.md"
        onChange={handleFileImport}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`notes-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          {/* Brand Header */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-icon-box">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="brand-title">SHINE Notes</div>
                <div className="brand-subtitle">Notes Workspace</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            {/* All Notes Nav Item */}
            <button
              type="button"
              onClick={() => {
                setCurrentView('notes');
                setSelectedTag(null);
                setIsSidebarOpen(false);
              }}
              className={`sidebar-nav-item ${
                currentView === 'notes' && !selectedTag ? 'is-active' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>All Notes</span>
              </div>
              <span className="nav-badge">{notes.length}</span>
            </button>

            {/* Trash Nav Item */}
            <button
              type="button"
              onClick={() => {
                setCurrentView('trash');
                setSelectedTag(null);
                setIsSidebarOpen(false);
              }}
              className={`sidebar-nav-item ${
                currentView === 'trash' ? 'is-active is-trash-active' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Trash</span>
              </div>
              <span className="nav-badge nav-badge-rose">{trashNotes.length}</span>
            </button>
          </nav>

          {/* Sidebar Tags Section */}
          <div className="sidebar-tags-section">
            <div className="sidebar-section-title">
              <div className="flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Tags</span>
              </div>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="sidebar-clear-filter-btn"
                  title="Clear tag filter"
                >
                  Clear
                </button>
              )}
            </div>

            {allUniqueTags.length === 0 ? (
              <p className="sidebar-empty-tags-hint">No tags yet. Add tags when creating notes!</p>
            ) : (
              <div className="sidebar-tags-list">
                {allUniqueTags.map(({ tag, count }) => {
                  const isActive = currentView === 'notes' && selectedTag?.toLowerCase() === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setCurrentView('notes');
                        setSelectedTag(isActive ? null : tag);
                        setIsSidebarOpen(false);
                      }}
                      className={`sidebar-tag-item ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="sidebar-tag-label">#{tag}</span>
                      <span className="sidebar-tag-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer: User Info & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={user?.name || displayName}>
                {user?.name || displayName}
              </div>
              <div className="sidebar-user-email" title={user?.email || 'Active User'}>
                {user?.email || 'Active User'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="sidebar-logout-btn"
            id="notes-logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="notes-main-area">
        {/* Top Sticky Bar */}
        <header className="notes-top-bar">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="mobile-menu-toggle"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Top Search Input */}
              <div className="notes-search-wrapper flex-1">
                <Search className="notes-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes by title or tag..."
                  className="notes-search-input"
                  id="notes-search-input"
                  aria-label="Search notes by title or tag"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="notes-search-clear"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Top Right Header User Profile Info */}
            <div className="notes-top-user flex items-center gap-2.5 shrink-0 pl-2">
              <div className="notes-top-avatar" title={user?.name || displayName}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="notes-top-user-details hidden sm:flex flex-col">
                <span className="notes-top-user-name" title={user?.name || displayName}>
                  {user?.name || displayName}
                </span>
                <span className="notes-top-user-email" title={user?.email || 'Active User'}>
                  {user?.email || 'Active User'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="notes-dashboard-content">
          {/* Global API Error Banner */}
          {apiError && (
            <div className="mb-6">
              <ErrorBanner
                message={apiError}
                onClose={() => setApiError(null)}
              />
            </div>
          )}

          {/* Success Notification Banner */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-emerald-200 text-sm font-medium animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Welcome Hero Banner (Only shown in active notes view when not filtering) */}
          {currentView === 'notes' && !selectedTag && !searchQuery && (
            <section className="notes-welcome-section">
              <div>
                <h1 className="welcome-heading">
                  Welcome back, {displayName} ✨
                </h1>
                <p className="welcome-subtext">
                  What's on your mind today? Capture ideas, reflections, and tasks seamlessly.
                </p>
              </div>
            </section>
          )}

          {/* Active Filter Pill indicator if filtering by Tag */}
          {selectedTag && currentView === 'notes' && (
            <div className="active-tag-filter-bar mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-purple-300">Filtering by Tag:</span>
                <span className="active-tag-pill">
                  #{selectedTag}
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 hover:text-white"
                    title="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>
            </div>
          )}

          {/* Notes Section Header */}
          <div className="notes-section-header">
            <div className="notes-section-title">
              {currentView === 'trash' ? (
                <>
                  <Trash2 className="w-5 h-5 text-rose-400" />
                  <span>Trash & Deleted Notes</span>
                  <span className="notes-count-pill notes-count-pill-rose">
                    {trashNotes.length} in trash
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>My Notes</span>
                  <span className="notes-count-pill">
                    {searchQuery || selectedTag
                      ? `${filteredNotes.length} matching`
                      : `${notes.length} total`}
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2.5">
              {currentView === 'trash' ? (
                <>
                  {trashNotes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenEmptyTrashConfirm}
                      className="empty-trash-btn"
                      title="Clear all trashed notes permanently"
                      id="empty-trash-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Empty Trash</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Single Clean + New Note Button (Single Plus Icon) */}
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="consolidated-create-btn"
                    id="dashboard-new-note-btn"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Note</span>
                  </button>

                  {/* Export Notes Action (Multi-select / All) */}
                  <button
                    type="button"
                    onClick={handleOpenExportModal}
                    disabled={notes.length === 0}
                    className="note-action-btn"
                    title="Export notes"
                    aria-label="Export notes"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Import Notes Action (.json, .txt, .md) */}
                  <button
                    type="button"
                    onClick={handleTriggerImport}
                    className="note-action-btn"
                    title="Import notes (.json, .txt, .md)"
                    aria-label="Import notes"
                  >
                    <Upload className="w-4 h-4" />
                  </button>

                  {/* Refresh / Sync Action */}
                  <button
                    type="button"
                    onClick={loadNotes}
                    disabled={isLoading}
                    className="note-action-btn"
                    title="Refresh notes from server"
                    aria-label="Refresh notes"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Trashed Items Retention Info Banner */}
          {currentView === 'trash' && trashNotes.length > 0 && (
            <div className="trash-info-banner mb-6">
              <span>Items in Trash are automatically purged after <strong>7 days</strong>. You can restore or permanently delete them below.</span>
            </div>
          )}

          {/* Notes Grid / Loading / Empty States */}
          {isLoading ? (
            /* Skeleton Loading Grid */
            <div className="notes-grid" aria-busy="true" aria-label="Loading notes">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="note-skeleton">
                  <div className="skeleton-title" />
                  <div>
                    <div className="skeleton-line" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line short" />
                  </div>
                </div>
              ))}
            </div>
          ) : currentView === 'trash' ? (
            /* Trash View Content */
            trashNotes.length === 0 ? (
              <div className="notes-empty-state">
                <div className="empty-state-icon-box">
                  <Trash2 className="w-9 h-9 text-purple-300" />
                </div>
                <h2 className="empty-state-title">Trash is Empty</h2>
                <p className="empty-state-desc">
                  No deleted notes in trash. When you delete notes from your workspace, they will stay here for 7 days.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentView('notes')}
                  className="note-editor-btn-secondary"
                >
                  Return to My Notes
                </button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="notes-empty-state">
                <div className="empty-state-icon-box">
                  <Search className="w-9 h-9 text-rose-300" />
                </div>
                <h2 className="empty-state-title">No matching trashed notes</h2>
                <p className="empty-state-desc">
                  No notes in trash match <span className="text-purple-200 font-semibold">"{searchQuery}"</span>.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="note-editor-btn-secondary"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    tags={note.tags || tagsMap[note._id] || []}
                    isTrashMode={true}
                    onRestore={handleRestoreNote}
                    onPermanentDelete={handleOpenPermanentDeleteConfirm}
                  />
                ))}
              </div>
            )
          ) : notes.length === 0 ? (
            /* Empty State: Zero Notes */
            <div className="notes-empty-state">
              <div className="empty-state-icon-box">
                <FolderPlus className="w-9 h-9" />
              </div>
              <h2 className="empty-state-title">No notes yet ✨</h2>
              <p className="empty-state-desc">
                Start capturing your thoughts, memories, and inspirations. Your personal workspace is ready.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="welcome-quick-btn"
                id="empty-state-create-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Create your first note</span>
              </button>
            </div>
          ) : filteredNotes.length === 0 ? (
            /* Empty State: No search results */
            <div className="notes-empty-state">
              <div className="empty-state-icon-box">
                <Search className="w-9 h-9 text-rose-300" />
              </div>
              <h2 className="empty-state-title">No notes found</h2>
              <p className="empty-state-desc">
                We couldn't find any notes matching{' '}
                {searchQuery && (
                  <span className="text-purple-200 font-semibold">"{searchQuery}"</span>
                )}
                {searchQuery && selectedTag && ' with '}
                {selectedTag && (
                  <span className="text-purple-200 font-semibold">#{selectedTag}</span>
                )}.
              </p>
              <div className="flex items-center gap-3">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="note-editor-btn-secondary"
                  >
                    Clear Search
                  </button>
                )}
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="note-editor-btn-secondary"
                  >
                    Clear Tag Filter
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Render Active Notes Grid */
            <div className="notes-grid">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  tags={note.tags || tagsMap[note._id] || []}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenTrashConfirm}
                  onTagClick={(tag) => setSelectedTag(tag)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Note Editor Modal (Create / Edit) */}
      <NoteEditor
        isOpen={isEditorOpen}
        initialNote={activeNote}
        initialTags={activeNote ? activeNote.tags || tagsMap[activeNote._id] || [] : []}
        onSave={handleSaveNote}
        onCancel={handleCloseEditor}
        isSaving={isSaving}
        externalError={editorError}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        note={noteToDelete}
        mode={deleteMode}
        onConfirm={handleConfirmDeleteAction}
        onCancel={handleCloseDelete}
        isDeleting={isDeleting}
      />

      {/* Export Selection Modal */}
      <ExportModal
        isOpen={isExportOpen}
        notes={notes}
        tagsMap={tagsMap}
        onExport={handleConfirmExport}
        onCancel={() => setIsExportOpen(false)}
      />
    </div>
  );
}
