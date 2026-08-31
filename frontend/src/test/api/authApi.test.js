import authClient, {
  signupUser,
  loginUser,
  logoutUser,
  saveAuthData,
  getAuthData,
  removeAuthData,
} from '../../api/authApi';

describe('authApi', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('API endpoints', () => {
    test('signupUser sends POST to /signup and returns data', async () => {
      const mockResponse = { data: { token: 'jwt-token-123', user: { id: 'u1', name: 'Alice', email: 'alice@test.com' } } };
      jest.spyOn(authClient, 'post').mockResolvedValueOnce(mockResponse);

      const payload = { name: 'Alice', email: 'alice@test.com', password: 'password123' };
      const result = await signupUser(payload);

      expect(authClient.post).toHaveBeenCalledWith('/signup', payload);
      expect(result).toEqual(mockResponse.data);
    });

    test('loginUser sends POST to /login and returns data', async () => {
      const mockResponse = { data: { token: 'jwt-token-456', user: { id: 'u2', name: 'Bob', email: 'bob@test.com' } } };
      jest.spyOn(authClient, 'post').mockResolvedValueOnce(mockResponse);

      const payload = { email: 'bob@test.com', password: 'password123' };
      const result = await loginUser(payload);

      expect(authClient.post).toHaveBeenCalledWith('/login', payload);
      expect(result).toEqual(mockResponse.data);
    });

    test('logoutUser sends POST to /logout with authorization header and returns data', async () => {
      const mockResponse = { data: { message: 'Logged out successfully' } };
      jest.spyOn(authClient, 'post').mockResolvedValueOnce(mockResponse);

      const result = await logoutUser('token-xyz');

      expect(authClient.post).toHaveBeenCalledWith(
        '/logout',
        {},
        {
          headers: {
            Authorization: 'Bearer token-xyz',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('LocalStorage helpers', () => {
    test('saveAuthData stores token and user in localStorage', () => {
      const user = { id: 'u1', name: 'Alice', email: 'alice@test.com' };
      saveAuthData('token-123', user);

      expect(localStorage.getItem('auth_token')).toBe('token-123');
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(user));
    });

    test('getAuthData returns token and parsed user when present', () => {
      const user = { id: 'u1', name: 'Alice', email: 'alice@test.com' };
      localStorage.setItem('auth_token', 'token-123');
      localStorage.setItem('auth_user', JSON.stringify(user));

      const authData = getAuthData();
      expect(authData).toEqual({ token: 'token-123', user });
    });

    test('getAuthData returns null fields when localStorage is empty', () => {
      const authData = getAuthData();
      expect(authData).toEqual({ token: null, user: null });
    });

    test('getAuthData returns null fields when JSON.parse throws error', () => {
      localStorage.setItem('auth_token', 'token-123');
      localStorage.setItem('auth_user', 'invalid-json-content{');

      const authData = getAuthData();
      expect(authData).toEqual({ token: null, user: null });
    });

    test('removeAuthData clears auth_token and auth_user from localStorage', () => {
      localStorage.setItem('auth_token', 'token-123');
      localStorage.setItem('auth_user', JSON.stringify({ id: 'u1' }));

      removeAuthData();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });
});
