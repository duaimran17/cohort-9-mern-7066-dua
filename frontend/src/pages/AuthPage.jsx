import { useState, useEffect } from 'react';
import WelcomeHero from '../components/WelcomeHero';
import AuthCard from '../components/AuthCard';
import AuthenticatedView from '../components/AuthenticatedView';
import { getAuthData, removeAuthData } from '../api/authApi';
import '../styles/AuthPage.css';

export default function AuthPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authState, setAuthState] = useState({
    token: null,
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const { token, user } = getAuthData();
    if (token && user) {
      setAuthState({ token, user, isAuthenticated: true });
    }
  }, []);

  const handleGetStarted = () => {
    setShowAuth(true);
  };

  const handleBackToWelcome = () => {
    setShowAuth(false);
  };

  const handleAuthSuccess = (data) => {
    setAuthState({
      token: data.token,
      user: data.user,
      isAuthenticated: true,
    });
  };

  const handleLogout = () => {
    removeAuthData();
    setAuthState({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    setShowAuth(false);
  };

  return (
    <div className="auth-page">
      {/* Ambient Twilight Vector Background */}
      <div className="ambient-glow-layer" aria-hidden="true">
        {/* Glow Orbs */}
        <div className="ambient-glow-orb top-left" />
        <div className="ambient-glow-orb bottom-right" />
        <div className="ambient-glow-orb center-plum" />

        {/* Floating Mist */}
        <div className="mist-layer" />

        {/* Translucent Vector Wireframe Shapes */}
        <svg className="vector-wireframe-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {/* Subtle Ring 1 */}
          <circle 
            className="wireframe-shape float-slow" 
            cx="250" 
            cy="250" 
            r="120" 
            stroke="rgba(255, 255, 255, 0.03)" 
            strokeWidth="1.5" 
            fill="none" 
          />
          {/* Subtle Ring 2 (Dashed) */}
          <circle 
            className="wireframe-shape float-medium" 
            cx="1200" 
            cy="650" 
            r="180" 
            stroke="rgba(168, 85, 247, 0.04)" 
            strokeWidth="1" 
            strokeDasharray="6 4"
            fill="none" 
          />
          {/* Triangle Shape 1 */}
          <polygon 
            className="wireframe-shape rotate-slow" 
            points="700,100 730,160 670,160" 
            stroke="rgba(219, 39, 119, 0.03)" 
            strokeWidth="1.5" 
            fill="none" 
          />
          {/* Triangle Shape 2 */}
          <polygon 
            className="wireframe-shape float-slow" 
            points="150,750 200,830 100,810" 
            stroke="rgba(255, 255, 255, 0.02)" 
            strokeWidth="1" 
            fill="none" 
          />
          {/* Geometric Ring 3 */}
          <circle 
            className="wireframe-shape rotate-slow" 
            cx="850" 
            cy="350" 
            r="80" 
            stroke="rgba(139, 92, 246, 0.03)" 
            strokeWidth="1" 
            fill="none" 
          />
        </svg>
      </div>

      {/* Main Authentication Stage */}
      {authState.isAuthenticated ? (
        <div className="auth-stage is-centered">
          <AuthenticatedView
            user={authState.user}
            token={authState.token}
            onLogout={handleLogout}
          />
        </div>
      ) : (
        <div className={`auth-stage ${showAuth ? 'is-split' : 'is-centered'}`}>
          <div className="welcome-section">
            <WelcomeHero
              onGetStarted={handleGetStarted}
              isSplitView={showAuth}
            />
          </div>

          {showAuth && (
            <div className="auth-card-section">
              <AuthCard
                onAuthSuccess={handleAuthSuccess}
                onBack={handleBackToWelcome}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
