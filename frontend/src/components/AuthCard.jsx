import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import ErrorBanner from './ErrorBanner';
import { signupUser, loginUser, saveAuthData } from '../api/authApi';
import '../styles/AuthCard.css';

export default function AuthCard({ initialMode = 'signin', onAuthSuccess, onBack }) {
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'signin'); // 'signin' | 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setErrorMsg(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side quick checks
    if (mode === 'signup' && !formData.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMsg('Please enter your password.');
      return;
    }
    if (mode === 'signup' && formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const data = await signupUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
        saveAuthData(data.token, data.user);
        if (onAuthSuccess) onAuthSuccess(data);
      } else {
        const data = await loginUser({
          email: formData.email.trim(),
          password: formData.password,
        });
        saveAuthData(data.token, data.user);
        if (onAuthSuccess) onAuthSuccess(data);
      }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const msg = err.response.data?.message;

        if (status === 400) {
          setErrorMsg(msg || 'All fields are required. Please check your inputs.');
        } else if (status === 401) {
          setErrorMsg(msg || 'Invalid email or password.');
        } else if (status === 409) {
          setErrorMsg(msg || 'An account with this email already exists.');
        } else {
          setErrorMsg(msg || `Server returned error (${status}).`);
        }
      } else if (err.request) {
        setErrorMsg('Unable to connect to the authentication server at http://localhost:5000');
      } else {
        setErrorMsg(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        <div className="auth-card-top-glow" />

        <div className="auth-card-header">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="auth-back-btn"
              id="auth-back-btn"
            >
              <ArrowLeft className="auth-back-icon" />
              <span>Back</span>
            </button>
          )}

          <h2 className="auth-title">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="auth-description">
            {mode === 'signin'
              ? 'Enter your credentials to access your workspace.'
              : 'Create an account to begin organizing your thoughts.'}
          </p>
        </div>

        {/* Error Banner */}
        <ErrorBanner message={errorMsg} onClose={() => setErrorMsg(null)} />

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {mode === 'signup' && (
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="auth-name-input">
                Full Name
              </label>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" />
                <input
                  type="text"
                  name="name"
                  id="auth-name-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="auth-input"
                />
              </div>
            </div>
          )}

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="auth-email-input">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" />
              <input
                type="email"
                name="email"
                id="auth-email-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
                className="auth-input"
              />
            </div>
          </div>

          <div className="auth-field-group">
            <label className="auth-label" htmlFor="auth-password-input">
              Password
            </label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="auth-password-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="auth-input has-toggle"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="auth-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            disabled={isLoading}
            className="auth-submit-btn"
          >
            {isLoading ? (
              <>
                <Loader2 className="auth-spinner" />
                <span>{mode === 'signin' ? 'Signing in...' : 'Registering...'}</span>
              </>
            ) : (
              <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          {mode === 'signin' ? (
            <p className="auth-toggle-text">
              Don't have an account?
              <button
                type="button"
                id="auth-toggle-btn"
                onClick={toggleMode}
                className="auth-toggle-link"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="auth-toggle-text">
              Already have an account?
              <button
                type="button"
                id="auth-toggle-btn"
                onClick={toggleMode}
                className="auth-toggle-link"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
