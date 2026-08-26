import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthCard from '../../components/AuthCard';
import AuthPage from '../../pages/AuthPage';

// -- Module mocks -------------------------------------------------------------

// authApi contains `import.meta.env` which is invalid in Jest's CJS runtime,
// so we mock the entire module and control return values per test.
jest.mock('../../api/authApi', () => ({
  signupUser: jest.fn(),
  loginUser: jest.fn(),
  saveAuthData: jest.fn(),
  getAuthData: jest.fn(() => ({ token: null, user: null })),
  removeAuthData: jest.fn(),
}));

// AuthenticatedView is 37 KB and out of scope for these tests.
jest.mock('../../components/AuthenticatedView', () =>
  function AuthenticatedViewStub() {
    return <div data-testid="authenticated-view" />;
  }
);

import { signupUser, loginUser } from '../../api/authApi';

// -- Shared helpers -----------------------------------------------------------

const VALID_EMAIL = 'test@example.com';
const VALID_PASSWORD = 'secret123';
const VALID_NAME = 'Jane Doe';
const SHORT_PASSWORD = '12345'; // 5 chars — one below the 6-char minimum

/** Render AuthCard in signin mode with a fresh userEvent instance. */
function renderSignin(props = {}) {
  const user = userEvent.setup();
  render(<AuthCard onAuthSuccess={jest.fn()} {...props} />);
  return { user };
}

/** Render AuthCard in signup mode with a fresh userEvent instance. */
function renderSignup(props = {}) {
  const user = userEvent.setup();
  render(<AuthCard initialMode="signup" onAuthSuccess={jest.fn()} {...props} />);
  return { user };
}

// -- AuthPage: page-level navigation ------------------------------------------

describe('AuthPage — unauthenticated initial state', () => {
  beforeEach(() => localStorage.clear());

  it('shows the Welcome heading and Get Started button before the form appears', () => {
    render(<AuthPage />);
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it('reveals the auth form after clicking Get Started', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });
});

// -- AuthCard signin: field-level validation ----------------------------------

describe('AuthCard signin — client-side validation', () => {
  it('shows an error when email is empty on submit', async () => {
    const { user } = renderSignin();
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your email address/i);
  });

  it('shows an error when email format is invalid', async () => {
    const { user } = renderSignin();
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email address/i);
  });

  it('shows an error when password is empty', async () => {
    const { user } = renderSignin();
    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your password/i);
  });
});

// -- AuthCard signup: field-level validation ----------------------------------

describe('AuthCard signup — client-side validation', () => {
  it('shows an error when full name is empty on submit', async () => {
    const { user } = renderSignup();
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your full name/i);
  });

  it('shows an error when password is shorter than 6 characters', async () => {
    const { user } = renderSignup();
    await user.type(screen.getByLabelText(/full name/i), VALID_NAME);
    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), SHORT_PASSWORD);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 6 characters/i);
  });
});

// -- AuthCard submit: API integration behaviour -------------------------------

describe('AuthCard signup — successful submit', () => {
  beforeEach(() => signupUser.mockResolvedValue({}));

  it('switches to signin mode and shows a success banner after registration', async () => {
    const { user } = renderSignup();
    await user.type(screen.getByLabelText(/full name/i), VALID_NAME);
    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/account created successfully/i)
    );
    // After successful signup the card must be in signin mode
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('AuthCard signin — successful submit', () => {
  const FAKE_TOKEN = 'tok_abc';
  const FAKE_USER = { id: '1', name: VALID_NAME, email: VALID_EMAIL };

  beforeEach(() =>
    loginUser.mockResolvedValue({ token: FAKE_TOKEN, user: FAKE_USER })
  );

  it('calls onAuthSuccess with the token and user returned by the API', async () => {
    const onAuthSuccess = jest.fn();
    const { user } = renderSignin({ onAuthSuccess });
    await user.type(screen.getByLabelText(/email address/i), VALID_EMAIL);
    await user.type(screen.getByLabelText(/^password$/i), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(onAuthSuccess).toHaveBeenCalledWith({ token: FAKE_TOKEN, user: FAKE_USER })
    );
  });
});

