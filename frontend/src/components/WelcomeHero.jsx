import { Sparkles, ArrowRight } from 'lucide-react';
import '../styles/WelcomeHero.css';

export default function WelcomeHero({ onGetStarted, isSplitView = false }) {
  return (
    <div className={`welcome-hero ${isSplitView ? 'align-left' : ''}`}>
      {/* Top Logo */}
      <div className="welcome-logo">
        <div className="welcome-logo-icon">
          <Sparkles className="logo-sparkle-icon" />
        </div>
        <span className="welcome-logo-text">
          SHINE <span className="welcome-logo-text-highlight">Notes</span>
        </span>
      </div>

      {/* Hero Header */}
      <h1 className="welcome-title">Welcome</h1>

      {/* Subtitle */}
      <p className="welcome-subtitle">Have a great journey ahead...</p>

      {/* Action Button */}
      <button
        type="button"
        id="get-started-btn"
        onClick={onGetStarted}
        className="welcome-btn"
      >
        <span>Get Started</span>
        <ArrowRight className="welcome-btn-arrow" />
      </button>
    </div>
  );
}
