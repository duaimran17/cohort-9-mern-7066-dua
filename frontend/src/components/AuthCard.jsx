import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, X } from 'lucide-react';
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
  const [successMsg, setSuccessMsg] = useState(null);

  const toggleMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    // Reset ALL form fields so values from one mode never bleed into the other
    setFormData({ name: '', email: '', password: '' });
    setShowPassword(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg(null);
    if (successMsg) setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Client-side quick checks
    if (mode === 'signup' && !formData.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg('Please enter a valid email address.');
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
        await signupUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });
        // Strict sign-up flow: DO NOT auto-login or store tokens on sign-up
        setSuccessMsg('Account created successfully! Please sign in.');
        setMode('signin');
        setFormData((prev) => ({
          ...prev,
          password: '',
        }));
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
        // Read directly from the API's actual response and display as-is
        const resData = err.response.data;
        const msg =
          (typeof resData === 'string'
            ? resData
            : resData?.message || resData?.error) ||
          `Server returned error (${err.response.status}).`;
        setErrorMsg(msg);
      } else if (err.request) {
        setErrorMsg('Unable to connect to the authentication server. Please check your network connection.');
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

        {/* Success Banner */}
        {successMsg && (
          <div role="status" className="auth-success-banner" id="auth-success-banner">
            <CheckCircle2 className="auth-success-icon" />
            <div className="auth-success-content">
              <div className="auth-success-title">Success</div>
              <div className="auth-success-message">{successMsg}</div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="auth-success-close"
              aria-label="Close success banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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