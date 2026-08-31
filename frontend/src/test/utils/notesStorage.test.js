import {
  loadTagsMap,
  saveNoteTags,
  removeNoteTags,
  loadTrashNotes,
  moveNoteToTrash,
  removeFromTrash,
  emptyTrashStorage,
  getRetentionTimeLeft,
  exportNotesToJson,
  parseImportFile,
} from '../../utils/notesStorage';

describe('notesStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Tags management', () => {
    test('loadTagsMap returns empty object if no tags saved', () => {
      expect(loadTagsMap('user123')).toEqual({});
      expect(loadTagsMap()).toEqual({});
    });

    test('loadTagsMap returns saved tags for given user', () => {
      localStorage.setItem('shine_tags_user123', JSON.stringify({ note1: ['work', 'urgent'] }));
      expect(loadTagsMap('user123')).toEqual({ note1: ['work', 'urgent'] });
      expect(loadTagsMap({ _id: 'user123' })).toEqual({ note1: ['work', 'urgent'] });
    });

    test('loadTagsMap returns empty object on corrupt JSON', () => {
      localStorage.setItem('shine_tags_user123', '{invalid-json');
      expect(loadTagsMap('user123')).toEqual({});
    });

    test('saveNoteTags saves cleaned tags for a note', () => {
      saveNoteTags('note1', [' #work ', 'urgent ', '#react '], 'user123');

      const stored = JSON.parse(localStorage.getItem('shine_tags_user123'));
      expect(stored).toEqual({ note1: ['work', 'urgent', 'react'] });
    });

    test('saveNoteTags handles guest user when user is not provided', () => {
      saveNoteTags('note1', ['idea']);
      const stored = JSON.parse(localStorage.getItem('shine_tags_guest'));
      expect(stored).toEqual({ note1: ['idea'] });
    });

    test('saveNoteTags handles non-array tags gracefully', () => {
      saveNoteTags('note1', null, 'user123');
      const stored = JSON.parse(localStorage.getItem('shine_tags_user123'));
      expect(stored).toEqual({ note1: [] });
    });

    test('saveNoteTags does nothing if noteId is falsy', () => {
      saveNoteTags('', ['tag'], 'user123');
      expect(localStorage.getItem('shine_tags_user123')).toBeNull();
    });

    test('removeNoteTags removes tags for a specific note', () => {
      localStorage.setItem(
        'shine_tags_user123',
        JSON.stringify({ note1: ['tag1'], note2: ['tag2'] })
      );

      removeNoteTags('note1', 'user123');

      const stored = JSON.parse(localStorage.getItem('shine_tags_user123'));
      expect(stored).toEqual({ note2: ['tag2'] });
    });

    test('saveNoteTags catches and warns on error', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => saveNoteTags('n1', ['tag'], 'u1')).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('removeNoteTags catches and warns on error', () => {
      localStorage.setItem('shine_tags_u1', JSON.stringify({ n1: ['tag'] }));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => removeNoteTags('n1', 'u1')).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Trash management', () => {
    test('moveNoteToTrash catches error and returns empty array on failure', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Quota error');
      });

      const res = moveNoteToTrash({ _id: 'n1' }, [], 'u1');
      expect(res).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('removeFromTrash catches error and returns empty array on failure', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('Read error');
      });

      const res = removeFromTrash('n1', 'u1');
      expect(res).toEqual([]);
    });

    test('loadTrashNotes returns empty array if no trash exists', () => {
      expect(loadTrashNotes('user123')).toEqual([]);
    });

    test('loadTrashNotes returns active trash items and purges expired (> 7 days)', () => {
      const now = Date.now();
      const freshNote = {
        _id: 'n1',
        title: 'Fresh Note',
        deletedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days old
      };
      const expiredNote = {
        _id: 'n2',
        title: 'Expired Note',
        deletedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days old
      };
      const invalidDateNote = {
        _id: 'n3',
        title: 'No date Note',
        deletedAt: 'invalid-date',
      };

      localStorage.setItem(
        'shine_trash_user123',
        JSON.stringify([freshNote, expiredNote, invalidDateNote, null])
      );

      const activeTrash = loadTrashNotes('user123');
      expect(activeTrash).toHaveLength(2);
      expect(activeTrash.map((n) => n._id)).toEqual(['n1', 'n3']);

      // Check that localStorage was updated with expired items removed
      const updatedStorage = JSON.parse(localStorage.getItem('shine_trash_user123'));
      expect(updatedStorage).toHaveLength(2);
    });

    test('loadTrashNotes returns empty array when parsed data is not an array or invalid JSON', () => {
      localStorage.setItem('shine_trash_user123', JSON.stringify({ not: 'an array' }));
      expect(loadTrashNotes('user123')).toEqual([]);

      localStorage.setItem('shine_trash_user123', '{bad-json');
      expect(loadTrashNotes('user123')).toEqual([]);
    });

    test('moveNoteToTrash adds note with deletedAt timestamp and prevents duplicates', () => {
      const note = { _id: 'n1', title: 'Note 1', content: 'Content 1' };
      const updated = moveNoteToTrash(note, ['tag1'], 'user123');

      expect(updated).toHaveLength(1);
      expect(updated[0]._id).toBe('n1');
      expect(updated[0].tags).toEqual(['tag1']);
      expect(updated[0].deletedAt).toBeDefined();

      // Moving the same note again replaces it at top
      const updatedAgain = moveNoteToTrash({ ...note, title: 'Note 1 modified' }, ['tag2'], 'user123');
      expect(updatedAgain).toHaveLength(1);
      expect(updatedAgain[0].title).toBe('Note 1 modified');
    });

    test('removeFromTrash removes note by ID', () => {
      const initialTrash = [
        { _id: 'n1', title: 'Note 1' },
        { _id: 'n2', title: 'Note 2' },
      ];
      localStorage.setItem('shine_trash_user123', JSON.stringify(initialTrash));

      const updated = removeFromTrash('n1', 'user123');
      expect(updated).toHaveLength(1);
      expect(updated[0]._id).toBe('n2');
    });

    test('emptyTrashStorage clears trash key from storage', () => {
      localStorage.setItem('shine_trash_user123', JSON.stringify([{ _id: 'n1' }]));
      emptyTrashStorage('user123');
      expect(localStorage.getItem('shine_trash_user123')).toBeNull();
    });
  });

  describe('getRetentionTimeLeft', () => {
    test('returns "7 days left" for missing or invalid dates', () => {
      expect(getRetentionTimeLeft()).toBe('7 days left');
      expect(getRetentionTimeLeft('invalid-date')).toBe('7 days left');
    });

    test('returns "Expiring now" when retention period has expired', () => {
      const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      expect(getRetentionTimeLeft(past)).toBe('Expiring now');
    });

    test('returns formatted days left when >= 1 day remains', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(getRetentionTimeLeft(threeDaysAgo)).toBe('4 days left');

      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      expect(getRetentionTimeLeft(sixDaysAgo)).toBe('1 day left');
    });

    test('returns formatted hours left when < 1 day remains', () => {
      const sixAndHalfDaysAgo = new Date(
        Date.now() - (6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
      ).toISOString();
      expect(getRetentionTimeLeft(sixAndHalfDaysAgo)).toMatch(/hours? left/);
    });
  });

  describe('exportNotesToJson', () => {
    test('creates and triggers a download of JSON file', () => {
      const mockNotes = [
        {
          _id: 'n1',
          title: 'Note 1',
          content: 'Content 1',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      ];
      const mockTagsMap = { n1: ['work'] };

      const createObjectURLMock = jest.fn(() => 'blob:mock-url');
      const revokeObjectURLMock = jest.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      exportNotesToJson(mockNotes, mockTagsMap);

      expect(clickSpy).toHaveBeenCalled();
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

      clickSpy.mockRestore();
    });
  });

  describe('parseImportFile', () => {
    test('rejects if no file provided', async () => {
      await expect(parseImportFile(null)).rejects.toThrow('No file selected.');
    });

    test('parses markdown or text file into note and extracts hashtags', async () => {
      const mdContent = '# My Header\nThis is a note with #productivity and #mern_test tags.';
      const file = new File([mdContent], 'My Note.md', { type: 'text/markdown' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('My Note');
      expect(notes[0].content).toBe(mdContent);
      expect(notes[0].tags).toEqual(['productivity', 'mern_test']);
    });

    test('parses text file with fallback tag "imported" if no hashtags present', async () => {
      const txtContent = 'Just some plain text note content.';
      const file = new File([txtContent], 'Plain.txt', { type: 'text/plain' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Plain');
      expect(notes[0].tags).toEqual(['imported']);
    });

    test('parses JSON array of notes', async () => {
      const jsonContent = JSON.stringify([
        { title: 'Note A', content: 'Content A', tags: [' #tag1 ', 'tag2'] },
        { title: ' ', content: 'Empty title note' }, // invalid
      ]);
      const file = new File([jsonContent], 'notes.json', { type: 'application/json' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Note A');
      expect(notes[0].tags).toEqual(['tag1', 'tag2']);
    });

    test('parses JSON object containing { notes: [...] }', async () => {
      const jsonContent = JSON.stringify({
        notes: [
          { title: 'Exported 1', content: 'Content 1', tags: ['tagA'] },
        ],
      });
      const file = new File([jsonContent], 'export.json', { type: 'application/json' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Exported 1');
    });

    test('parses single note JSON object', async () => {
      const jsonContent = JSON.stringify({
        title: 'Single Note',
        content: 'Single Content',
      });
      const file = new File([jsonContent], 'note.json', { type: 'application/json' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('Single Note');
    });

    test('falls back to raw text note when JSON.parse fails on a json file', async () => {
      const invalidJsonContent = 'This is corrupted { json file content';
      const file = new File([invalidJsonContent], 'corrupt.json', { type: 'application/json' });

      const notes = await parseImportFile(file);
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe('corrupt');
      expect(notes[0].content).toBe(invalidJsonContent);
      expect(notes[0].tags).toEqual(['imported']);
    });

    test('rejects empty file', async () => {
      const file = new File(['   '], 'empty.txt', { type: 'text/plain' });
      await expect(parseImportFile(file)).rejects.toThrow('The uploaded file is empty.');
    });

    test('rejects when JSON format is invalid object without notes or title/content', async () => {
      const jsonContent = JSON.stringify({ someKey: 'someValue' });
      const file = new File([jsonContent], 'invalid_format.json', { type: 'application/json' });

      await expect(parseImportFile(file)).rejects.toThrow(
        'Invalid notes export format. Expected JSON list or note object.'
      );
    });

    test('rejects when FileReader triggers onerror', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const origRead = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function () {
        if (this.onerror) this.onerror();
      };

      await expect(parseImportFile(file)).rejects.toThrow('File reading error.');
      FileReader.prototype.readAsText = origRead;
    });

    test('rejects when FileReader result is not a string', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const origRead = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function () {
        if (this.onload) this.onload({ target: { result: 12345 } });
      };

      await expect(parseImportFile(file)).rejects.toThrow('Failed to read file content.');
      FileReader.prototype.readAsText = origRead;
    });

    test('rejects when valid JSON has no non-empty notes', async () => {
      const jsonContent = JSON.stringify([{ title: '', content: '' }]);
      const file = new File([jsonContent], 'empty_notes.json', { type: 'application/json' });

      await expect(parseImportFile(file)).rejects.toThrow(
        'No valid notes found in the uploaded file.'
      );
    });
  });
});
