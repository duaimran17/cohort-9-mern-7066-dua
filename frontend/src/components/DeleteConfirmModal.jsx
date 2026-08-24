import { useEffect } from 'react';
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  note,
  mode = 'trash', // 'trash' | 'permanent' | 'empty-trash'
  onConfirm,
  onCancel,
  isDeleting,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, isDeleting]);

  if (!isOpen) return null;

  const isTrashMode = mode === 'trash';
  const isEmptyTrashMode = mode === 'empty-trash';

  let titleText = 'Move to Trash?';
  let descriptionNode = (
    <p id="delete-dialog-description" className="text-sm text-purple-200/70 mb-3">
      Are you sure you want to move <span className="font-semibold text-rose-300">"{note?.title}"</span> to Trash? Trashed items are retained for 7 days before permanent deletion.
    </p>
  );
  let confirmBtnText = 'Move to Trash';

  if (isEmptyTrashMode) {
    titleText = 'Empty Trash?';
    descriptionNode = (
      <p id="delete-dialog-description" className="text-sm text-purple-200/70 mb-3">
        Are you sure you want to permanently delete all items in Trash? This cannot be recovered.
      </p>
    );
    confirmBtnText = 'Empty Everything';
  } else if (!isTrashMode) {
    titleText = 'Permanently Delete Note?';
    descriptionNode = (
      <p id="delete-dialog-description" className="text-sm text-purple-200/70 mb-3">
        Are you sure you want to permanently delete <span className="font-semibold text-rose-300">"{note?.title}"</span>? This action cannot be undone.
      </p>
    );
    confirmBtnText = 'Delete Forever';
  }

  return (
    <div
      className="note-editor-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <div className="delete-modal-container">
        {/* Top Danger Glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            {isEmptyTrashMode ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="note-editor-close-btn"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="mb-6">
          <h2 id="delete-dialog-title" className="text-lg sm:text-xl font-bold font-['Outfit'] text-white mb-2">
            {titleText}
          </h2>
          {descriptionNode}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="note-editor-btn-secondary"
            id="delete-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 border border-rose-400/40 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50"
            id="delete-confirm-btn"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-white" />
                <span>{confirmBtnText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
