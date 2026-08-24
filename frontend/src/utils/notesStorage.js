
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Storage keys
const getTagsKey = (userId) => (userId ? `shine_note_tags_${userId}` : 'shine_note_tags');
const getTrashKey = (userId) => `shine_notes_trash_${userId || 'guest'}`;

/**
 * Loads the tags map { [noteId]: string[] } for a user, checking both user-scoped and global keys
 * @param {string} [userId]
 * @returns {Record<string, string[]>}
 */
export const loadTagsMap = (userId) => {
  try {
    const userKey = getTagsKey(userId);
    const rawUser = localStorage.getItem(userKey);
    if (rawUser) {
      return JSON.parse(rawUser) || {};
    }

    // One-time legacy migration read: fallback to global/old keys if user-scoped key doesn't exist
    const rawGlobal = localStorage.getItem('shine_note_tags');
    const rawLegacy = localStorage.getItem(`shine_notes_tags_${userId || 'guest'}`);

    const parsedGlobal = rawGlobal ? JSON.parse(rawGlobal) : {};
    const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : {};

    return {
      ...parsedLegacy,
      ...parsedGlobal,
    };
  } catch {
    return {};
  }
};

/**
 * Saves tags for a specific note to localStorage
 * @param {string} noteId
 * @param {string[]} tags
 * @param {string} [userId]
 */
export const saveNoteTags = (noteId, tags, userId) => {
  if (!noteId) return;
  try {
    const current = loadTagsMap(userId);
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean)
      : [];

    current[noteId] = cleanTags;

    // Save only to user-scoped key
    const userKey = getTagsKey(userId);
    const serialized = JSON.stringify(current);
    localStorage.setItem(userKey, serialized);
  } catch (err) {
    console.warn('Failed to save tags to localStorage', err);
  }
};

/**
 * Removes tags for a deleted note
 * @param {string} noteId
 * @param {string} [userId]
 */
export const removeNoteTags = (noteId, userId) => {
  if (!noteId) return;
  try {
    const current = loadTagsMap(userId);
    delete current[noteId];

    const serialized = JSON.stringify(current);
    localStorage.setItem(getTagsKey(userId), serialized);
  } catch (err) {
    console.warn('Failed to remove tags', err);
  }
};

/**
 * Loads all trashed notes for a user, auto-purging items older than 7 days
 * @param {string} [userId]
 * @returns {Array<any>}
 */
export const loadTrashNotes = (userId) => {
  try {
    const raw = localStorage.getItem(getTrashKey(userId));
    if (!raw) return [];
    const trashed = JSON.parse(raw);
    if (!Array.isArray(trashed)) return [];

    const now = Date.now();
    // Filter out notes soft-deleted more than 7 days ago (keep missing/invalid deletedAt as fresh)
    const activeTrash = trashed.filter((item) => {
      if (!item) return false;
      if (!item.deletedAt) return true;
      const deletedTime = new Date(item.deletedAt).getTime();
      if (isNaN(deletedTime)) return true;
      const age = now - deletedTime;
      return age < SEVEN_DAYS_MS;
    });

    // If any items were purged, save the updated trash
    if (activeTrash.length !== trashed.length) {
      localStorage.setItem(getTrashKey(userId), JSON.stringify(activeTrash));
    }

    return activeTrash;
  } catch {
    return [];
  }
};

/**
 * Moves a note to trash with a deletedAt timestamp
 * @param {any} note
 * @param {string[]} [tags]
 * @param {string} [userId]
 * @returns {Array<any>} updated trash list
 */
export const moveNoteToTrash = (note, tags = [], userId) => {
  try {
    const current = loadTrashNotes(userId);
    const trashedNote = {
      ...note,
      tags: tags || [],
      deletedAt: new Date().toISOString(),
    };
    // Ensure no duplicates
    const filtered = current.filter((n) => n._id !== note._id);
    const updated = [trashedNote, ...filtered];
    localStorage.setItem(getTrashKey(userId), JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to move note to trash', err);
    return [];
  }
};

/**
 * Removes a note from trash (for Restore or Permanent Delete)
 * @param {string} noteId
 * @param {string} [userId]
 * @returns {Array<any>} updated trash list
 */
export const removeFromTrash = (noteId, userId) => {
  try {
    const current = loadTrashNotes(userId);
    const updated = current.filter((n) => n._id !== noteId);
    localStorage.setItem(getTrashKey(userId), JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

/**
 * Empties all trashed notes
 * @param {string} [userId]
 */
export const emptyTrashStorage = (userId) => {
  try {
    localStorage.removeItem(getTrashKey(userId));
  } catch {
    // ignore
  }
};

/**
 * Calculate remaining retention days/hours for a soft-deleted note
 * @param {string} deletedAt
 * @returns {string} e.g. "6 days left" or "18 hours left"
 */
export const getRetentionTimeLeft = (deletedAt) => {
  if (!deletedAt) return '7 days left';
  const deletedTime = new Date(deletedAt).getTime();
  if (isNaN(deletedTime)) return '7 days left';
  const age = Date.now() - deletedTime;
  const remainingMs = SEVEN_DAYS_MS - age;
  if (remainingMs <= 0) return 'Expiring now';

  const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (remainingDays >= 1) {
    return `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left`;
  }
  const remainingHours = Math.max(1, Math.floor(remainingMs / (60 * 60 * 1000)));
  return `${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'} left`;
};

/**
 * Exports notes and associated tags to a JSON file
 * @param {Array<any>} notes
 * @param {Record<string, string[]>} tagsMap
 */
export const exportNotesToJson = (notes, tagsMap = {}) => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    app: 'SHINE Notes',
    totalNotes: notes.length,
    notes: notes.map((note) => ({
      title: note.title,
      content: note.content,
      tags: note.tags || tagsMap[note._id] || [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', objectUrl);
  downloadAnchor.setAttribute('download', `shine-notes-export-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(objectUrl);
};

/**
 * Parses an uploaded file (.json, .txt, or .md) and extracts valid note object(s)
 * @param {File} file
 * @returns {Promise<Array<{ title: string, content: string, tags?: string[] }>>}
 */
export const parseImportFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected.'));
    }

    const fileName = file.name || 'Untitled Note';
    const isMarkdownOrText = /\.(md|txt)$/i.test(fileName);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          return reject(new Error('Failed to read file content.'));
        }

        const trimmedText = text.trim();
        if (!trimmedText) {
          return reject(new Error('The uploaded file is empty.'));
        }

        // If file is .md or .txt, create a note with the filename as title
        if (isMarkdownOrText) {
          const rawTitle = fileName.replace(/\.(md|txt)$/i, '').trim();
          const cleanTitle = rawTitle || 'Imported Note';

          // Optional: look for tags in hashtags like #topic inside text
          const extractedTags = [];
          const hashMatches = trimmedText.match(/#([a-zA-Z0-9_-]{2,20})/g);
          if (hashMatches) {
            hashMatches.forEach((h) => {
              const tag = h.replace(/^#/, '').trim().toLowerCase();
              if (tag && !extractedTags.includes(tag)) {
                extractedTags.push(tag);
              }
            });
          }

          return resolve([
            {
              title: cleanTitle,
              content: trimmedText,
              tags: extractedTags.length > 0 ? extractedTags : ['imported'],
            },
          ]);
        }

        // Otherwise attempt JSON parse
        let data;
        try {
          data = JSON.parse(trimmedText);
        } catch {
          // If JSON parse fails, fallback to treating as raw text note
          const rawTitle = fileName.replace(/\.[^/.]+$/, '').trim();
          return resolve([
            {
              title: rawTitle || 'Imported Note',
              content: trimmedText,
              tags: ['imported'],
            },
          ]);
        }

        let items = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && Array.isArray(data.notes)) {
          items = data.notes;
        } else if (data && typeof data.title === 'string' && typeof data.content === 'string') {
          items = [data];
        } else {
          return reject(new Error('Invalid notes export format. Expected JSON list or note object.'));
        }

        const validNotes = items
          .filter(
            (item) =>
              item &&
              typeof item.title === 'string' &&
              item.title.trim() !== '' &&
              typeof item.content === 'string' &&
              item.content.trim() !== ''
          )
          .map((item) => ({
            title: item.title.trim(),
            content: item.content.trim(),
            tags: Array.isArray(item.tags)
              ? item.tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean)
              : [],
          }));

        if (validNotes.length === 0) {
          return reject(new Error('No valid notes found in the uploaded file.'));
        }

        resolve(validNotes);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to process uploaded file.'));
      }
    };

    reader.onerror = () => reject(new Error('File reading error.'));
    reader.readAsText(file);
  });
};
