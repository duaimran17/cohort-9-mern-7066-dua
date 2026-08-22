import { AlertCircle, X } from 'lucide-react';
import '../styles/ErrorBanner.css';

export default function ErrorBanner({ message, onClose }) {
  if (!message) return null;

  return (
    <div role="alert" className="error-banner" id="auth-error-banner">
      <AlertCircle className="error-banner-icon" />
      <div className="error-banner-content">
        <div className="error-banner-title">Error</div>
        <div className="error-banner-message">{message}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="error-banner-close"
          aria-label="Close error banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
