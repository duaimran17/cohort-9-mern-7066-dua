import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthCard from '../../components/AuthCard';
import AuthPage from '../../pages/AuthPage';

// Module mocks 
jest.mock('../../api/authApi', () => ({
  signupUser: jest.fn(),
  loginUser: jest.fn(),
  saveAuthData: jest.fn(),
  getAuthData: jest.fn(() => ({ token: null, user: null })),
  removeAuthData: jest.fn(),
}));

jest.mock('../../components/AuthenticatedView', () =>
  function AuthenticatedViewStub() {
    return <div data-testid="authenticated-view" />;
  }
);

import { signupUser, loginUser, saveAuthData } from '../../api/authApi';


const VALID_EMAIL = 'test@example.com';
const VALID_PASSWORD = 'secret123';
const VALID_NAME = 'Jane Doe';
const SHORT_PASSWORD = '12345';


function renderSignin(props = {}) {
  const user = userEvent.setup();
  render(<AuthCard onAuthSuccess={jest.fn()} {...props} />);
  return { user };
}


function renderSignup(props = {}) {
  const user = userEvent.setup();
  render(<AuthCard initialMode="signup" onAuthSuccess={jest.fn()} {...props} />);
  return { user };
}

// AuthPage

describe('AuthPage — unauthenticated initial state', () => {
  beforeEach(() => localStorage.clear());

  it('shows the Welcome heading and Get Started button before the form appears', () => {
    render(<AuthPage />);
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('reveals the auth form after clicking Get Started', async () => {
    try {
      const user = userEvent.setup();
      render(<AuthPage />);
      await user.click(screen.getByRole('button', { name: /get started/i }));
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed to reveal auth form after clicking Get Started: ${error.message}`);
    }
  });
});

// signin:

describe('AuthCard signin — client-side validation', () => {
  it('shows an error when email is empty on submit', async () => {
    try {
      const { user } = renderSignin();
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/enter your email address/i);
    } catch (error) {
      throw new Error(`Failed asserting empty email validation on signin: ${error.message}`);
    }
  });

  it('shows an error when email format is invalid', async () => {
    try {
      const { user } = renderSignin();
      await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/valid email address/i);
    } catch (error) {
      throw new Error(`Failed asserting invalid email format validation on signin: ${error.message}`);
    }
  });

  it('shows an error when password is empty', async () => {
    try {
      const { user } = renderSignin();
      await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/enter your password/i);
    } catch (error) {
      throw new Error(`Failed asserting empty password validation on signin: ${error.message}`);
    }
  });
});

// AuthCard signup

describe('AuthCard signup — client-side validation', () => {
  it('shows an error when full name is empty on submit', async () => {
    try {
      const { user } = renderSignup();
      await user.click(screen.getByRole('button', { name: /create account/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/enter your full name/i);
    } catch (error) {
      throw new Error(`Failed asserting empty full name validation on signup: ${error.message}`);
    }
  });

  it('shows an error when password is shorter than 6 characters', async () => {
    try {
      const { user } = renderSignup();
      await user.type(screen.getByLabelText(/full name/i), VALID_NAME);
      await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
      await user.type(screen.getByLabelText(/^password$/i), SHORT_PASSWORD);
      await user.click(screen.getByRole('button', { name: /create account/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/at least 6 characters/i);
    } catch (error) {
      throw new Error(`Failed asserting minimum password length validation on signup: ${error.message}`);
    }
  });
});


describe('AuthCard signup — successful submit', () => {
  beforeEach(() => {
    signupUser.mockReset();
    signupUser.mockResolvedValue({});
  });

  it('switches to signin mode and shows a success banner after registration', async () => {
    try {
      const { user } = renderSignup();
      await user.type(screen.getByLabelText(/full name/i), VALID_NAME);
      await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
      await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(/account created successfully/i)
      );

      expect(signupUser).toHaveBeenCalledWith({
        name: VALID_NAME,
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });


      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    } catch (error) {
      throw new Error(`Failed asserting successful signup flow: ${error.message}`);
    }
  });
});

describe('AuthCard signin — successful submit', () => {
  const FAKE_TOKEN = 'tok_abc';
  const FAKE_USER = { id: '1', name: VALID_NAME, email: VALID_EMAIL };

  beforeEach(() => {
    loginUser.mockReset();
    saveAuthData.mockReset();
    loginUser.mockResolvedValue({ token: FAKE_TOKEN, user: FAKE_USER });
  });

  it('calls onAuthSuccess with the token and user returned by the API', async () => {
    try {
      const onAuthSuccess = jest.fn();
      const { user } = renderSignin({ onAuthSuccess });
      await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
      await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() =>
        expect(onAuthSuccess).toHaveBeenCalledWith({ token: FAKE_TOKEN, user: FAKE_USER })
      );

      expect(loginUser).toHaveBeenCalledWith({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });
      expect(saveAuthData).toHaveBeenCalledWith(FAKE_TOKEN, FAKE_USER);
    } catch (error) {
      throw new Error(`Failed asserting successful signin flow: ${error.message}`);
    }
  });
});
