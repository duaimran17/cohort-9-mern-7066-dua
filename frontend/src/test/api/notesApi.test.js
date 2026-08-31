import notesClient, {
  fetchNotes,
  fetchNoteById,
  createNote,
  updateNote,
  deleteNote,
  extractApiErrorMessage,
} from '../../api/notesApi';
import * as authApi from '../../api/authApi';

describe('notesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API endpoints', () => {
    test('fetchNotes sends GET / without explicit token', async () => {
      const mockNotes = [{ _id: '1', title: 'Note 1', content: 'Content 1' }];
      jest.spyOn(notesClient, 'get').mockResolvedValueOnce({ data: mockNotes });

      const result = await fetchNotes();

      expect(notesClient.get).toHaveBeenCalledWith('/', { headers: {} });
      expect(result).toEqual(mockNotes);
    });

    test('fetchNotes sends GET / with explicit token header', async () => {
      const mockNotes = [{ _id: '1', title: 'Note 1', content: 'Content 1' }];
      jest.spyOn(notesClient, 'get').mockResolvedValueOnce({ data: mockNotes });

      const result = await fetchNotes('my-token');

      expect(notesClient.get).toHaveBeenCalledWith('/', {
        headers: { Authorization: 'Bearer my-token' },
      });
      expect(result).toEqual(mockNotes);
    });

    test('fetchNoteById sends GET /:id with token', async () => {
      const mockNote = { _id: '123', title: 'Single Note', content: 'Single Content' };
      jest.spyOn(notesClient, 'get').mockResolvedValueOnce({ data: mockNote });

      const result = await fetchNoteById('123', 'token-abc');

      expect(notesClient.get).toHaveBeenCalledWith('/123', {
        headers: { Authorization: 'Bearer token-abc' },
      });
      expect(result).toEqual(mockNote);
    });

    test('fetchNoteById sends GET /:id without token', async () => {
      const mockNote = { _id: '123', title: 'Single Note', content: 'Single Content' };
      jest.spyOn(notesClient, 'get').mockResolvedValueOnce({ data: mockNote });

      const result = await fetchNoteById('123');

      expect(notesClient.get).toHaveBeenCalledWith('/123', { headers: {} });
      expect(result).toEqual(mockNote);
    });

    test('createNote sends POST / with payload and token', async () => {
      const newNote = { title: 'New Note', content: 'New Content' };
      const mockResponse = { _id: 'new-id', ...newNote };
      jest.spyOn(notesClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await createNote(newNote, 'token-abc');

      expect(notesClient.post).toHaveBeenCalledWith(
        '/',
        { title: 'New Note', content: 'New Content' },
        { headers: { Authorization: 'Bearer token-abc' } }
      );
      expect(result).toEqual(mockResponse);
    });

    test('createNote sends POST / without token', async () => {
      const newNote = { title: 'New Note', content: 'New Content' };
      const mockResponse = { _id: 'new-id', ...newNote };
      jest.spyOn(notesClient, 'post').mockResolvedValueOnce({ data: mockResponse });

      const result = await createNote(newNote);

      expect(notesClient.post).toHaveBeenCalledWith(
        '/',
        { title: 'New Note', content: 'New Content' },
        { headers: {} }
      );
      expect(result).toEqual(mockResponse);
    });

    test('updateNote sends PUT /:id with payload and token', async () => {
      const updateData = { title: 'Updated Note', content: 'Updated Content' };
      const mockResponse = { _id: 'update-id', ...updateData };
      jest.spyOn(notesClient, 'put').mockResolvedValueOnce({ data: mockResponse });

      const result = await updateNote('update-id', updateData, 'token-abc');

      expect(notesClient.put).toHaveBeenCalledWith(
        '/update-id',
        { title: 'Updated Note', content: 'Updated Content' },
        { headers: { Authorization: 'Bearer token-abc' } }
      );
      expect(result).toEqual(mockResponse);
    });

    test('updateNote sends PUT /:id without token', async () => {
      const updateData = { title: 'Updated Note', content: 'Updated Content' };
      const mockResponse = { _id: 'update-id', ...updateData };
      jest.spyOn(notesClient, 'put').mockResolvedValueOnce({ data: mockResponse });

      const result = await updateNote('update-id', updateData);

      expect(notesClient.put).toHaveBeenCalledWith(
        '/update-id',
        { title: 'Updated Note', content: 'Updated Content' },
        { headers: {} }
      );
      expect(result).toEqual(mockResponse);
    });

    test('deleteNote sends DELETE /:id with token', async () => {
      const mockResponse = { message: 'Note deleted' };
      jest.spyOn(notesClient, 'delete').mockResolvedValueOnce({ data: mockResponse });

      const result = await deleteNote('delete-id', 'token-abc');

      expect(notesClient.delete).toHaveBeenCalledWith('/delete-id', {
        headers: { Authorization: 'Bearer token-abc' },
      });
      expect(result).toEqual(mockResponse);
    });

    test('deleteNote sends DELETE /:id without token', async () => {
      const mockResponse = { message: 'Note deleted' };
      jest.spyOn(notesClient, 'delete').mockResolvedValueOnce({ data: mockResponse });

      const result = await deleteNote('delete-id');

      expect(notesClient.delete).toHaveBeenCalledWith('/delete-id', {
        headers: {},
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Interceptors', () => {
    test('request interceptor automatically attaches stored token if no Authorization header exists', async () => {
      jest.spyOn(authApi, 'getAuthData').mockReturnValue({ token: 'stored-jwt-token', user: null });

      const interceptor = notesClient.interceptors.request.handlers[0];
      const config = { headers: {} };
      const updatedConfig = await interceptor.fulfilled(config);

      expect(updatedConfig.headers.Authorization).toBe('Bearer stored-jwt-token');
    });

    test('request interceptor does not overwrite existing Authorization header', async () => {
      jest.spyOn(authApi, 'getAuthData').mockReturnValue({ token: 'stored-jwt-token', user: null });

      const interceptor = notesClient.interceptors.request.handlers[0];
      const config = { headers: { Authorization: 'Bearer existing-token' } };
      const updatedConfig = await interceptor.fulfilled(config);

      expect(updatedConfig.headers.Authorization).toBe('Bearer existing-token');
    });

    test('request interceptor does not attach header when stored token is null', async () => {
      jest.spyOn(authApi, 'getAuthData').mockReturnValue({ token: null, user: null });

      const interceptor = notesClient.interceptors.request.handlers[0];
      const config = { headers: {} };
      const updatedConfig = await interceptor.fulfilled(config);

      expect(updatedConfig.headers.Authorization).toBeUndefined();
    });

    test('request interceptor rejects error in rejected handler', async () => {
      const interceptor = notesClient.interceptors.request.handlers[0];
      const error = new Error('Request configuration error');

      await expect(interceptor.rejected(error)).rejects.toThrow('Request configuration error');
    });
  });

  describe('extractApiErrorMessage', () => {
    test('returns session expired message on 401 response', () => {
      const err = {
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      expect(extractApiErrorMessage(err)).toBe(
        'Your session has expired or is unauthorized. Please sign in again.'
      );
    });

    test('returns custom 404 message when available', () => {
      const err = {
        response: { status: 404, data: { message: 'Custom note not found' } },
      };
      expect(extractApiErrorMessage(err)).toBe('Custom note not found');
    });

    test('returns default 404 message when no data message provided', () => {
      const err = {
        response: { status: 404, data: {} },
      };
      expect(extractApiErrorMessage(err)).toBe('The requested note was not found.');
    });

    test('returns server error message with custom data message on 500 response', () => {
      const err = {
        response: { status: 500, data: { message: 'Database connection failed' } },
      };
      expect(extractApiErrorMessage(err)).toBe('Database connection failed');
    });

    test('returns fallback server error message on other status codes when no data message provided', () => {
      const err = {
        response: { status: 503, data: null },
      };
      expect(extractApiErrorMessage(err)).toBe('Server error (503). Please try again.');
    });

    test('returns network connection error when err.request exists without response', () => {
      const err = {
        request: {},
      };
      expect(extractApiErrorMessage(err)).toBe(
        'Unable to reach the server. Please check your network connection.'
      );
    });

    test('returns err.message when present', () => {
      const err = new Error('Generic JavaScript Error');
      expect(extractApiErrorMessage(err)).toBe('Generic JavaScript Error');
    });

    test('returns fallback message for empty error object', () => {
      const err = {};
      expect(extractApiErrorMessage(err)).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });
});
