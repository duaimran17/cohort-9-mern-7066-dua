import axios from 'axios';
import { getAuthData } from './authApi';

const API_BASE_URL = import.meta.env.VITE_NOTES_API_URL || 'http://localhost:5000/api/notes';

const notesClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach JWT token automatically from storage if not explicitly provided
notesClient.interceptors.request.use(
  (config) => {
    if (!config.headers.Authorization) {
      const { token } = getAuthData();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Fetch all notes for the authenticated user
 * @param {string} [token]
 * @returns {Promise<Array<{ _id: string, title: string, content: string, owner: string, createdAt: string, updatedAt: string }>>}
 */
export const fetchNotes = async (token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await notesClient.get('/', { headers });
  return response.data;
};

/**
 * Fetch a single note by ID
 * @param {string} id
 * @param {string} [token]
 * @returns {Promise<{ _id: string, title: string, content: string, owner: string, createdAt: string, updatedAt: string }>}
 */
export const fetchNoteById = async (id, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await notesClient.get(`/${id}`, { headers });
  return response.data;
};

/**
 * Create a new note
 * @param {{ title: string, content: string }} noteData
 * @param {string} [token]
 * @returns {Promise<{ _id: string, title: string, content: string, owner: string, createdAt: string, updatedAt: string }>}
 */
export const createNote = async ({ title, content }, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await notesClient.post('/', { title, content }, { headers });
  return response.data;
};

/**
 * Update an existing note
 * @param {string} id
 * @param {{ title?: string, content?: string }} noteData
 * @param {string} [token]
 * @returns {Promise<{ _id: string, title: string, content: string, owner: string, createdAt: string, updatedAt: string }>}
 */
export const updateNote = async (id, { title, content }, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await notesClient.put(`/${id}`, { title, content }, { headers });
  return response.data;
};

/**
 * Delete a note by ID
 * @param {string} id
 * @param {string} [token]
 * @returns {Promise<{ message: string }>}
 */
export const deleteNote = async (id, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await notesClient.delete(`/${id}`, { headers });
  return response.data;
};

/**
 * Parse and extract friendly error message from Axios errors
 * @param {any} err
 * @returns {string}
 */
export const extractApiErrorMessage = (err) => {
  if (err.response) {
    if (err.response.status === 401) {
      return 'Your session has expired or is unauthorized. Please sign in again.';
    }
    if (err.response.status === 404) {
      return err.response.data?.message || 'The requested note was not found.';
    }
    return err.response.data?.message || `Server error (${err.response.status}). Please try again.`;
  }
  if (err.request) {
    return 'Unable to reach the server. Please check your network connection.';
  }
  return err.message || 'An unexpected error occurred. Please try again.';
};

export default notesClient;
