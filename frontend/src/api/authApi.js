import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api/auth';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Register a new user
 * @param {{ name: string, email: string, password: string }} data
 * @returns {Promise<{ token: string, user: { id: string, name: string, email: string } }>}
 */
export const signupUser = async ({ name, email, password }) => {
  const response = await authClient.post('/signup', { name, email, password });
  return response.data;
};

/**
 * Log in an existing user
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ token: string, user: { id: string, name: string, email: string } }>}
 */
export const loginUser = async ({ email, password }) => {
  const response = await authClient.post('/login', { email, password });
  return response.data;
};

/**
 * Invalidate user session and logout
 * @param {string} token
 * @returns {Promise<{ message: string }>}
 */
export const logoutUser = async (token) => {
  const response = await authClient.post(
    '/logout',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// LocalStorage helpers
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const saveAuthData = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getAuthData = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

export const removeAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export default authClient;
