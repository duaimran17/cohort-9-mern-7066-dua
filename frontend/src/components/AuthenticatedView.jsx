import { useState } from 'react';
import { 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  User, 
  Mail, 
  ShieldCheck, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { logoutUser, removeAuthData } from '../api/authApi';

export default function AuthenticatedView({ user, token, onLogout }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      if (token) {
        await logoutUser(token);
      }
    } catch {
      // Even if network or token error happens, clear local storage
    } finally {
      removeAuthData();
      setIsLoggingOut(false);
      onLogout();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl glass-card relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95">
      {/* Decorative top ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500/80 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Active Session</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-violet-300 font-semibold font-['Outfit']">
          <Sparkles className="w-4 h-4 text-fuchsia-400" />
          <span>SHINE NOTES</span>
        </div>
      </div>

      {/* User Greeting & Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-xl font-bold font-['Outfit'] shadow-lg shadow-purple-500/30 border border-white/20">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white">
            {user?.name || 'Authorized User'}
          </h2>
          <p className="text-xs sm:text-sm text-violet-300/70">
            Have a great journey ahead...
          </p>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-950/50 border border-violet-500/20">
          <div className="flex items-center gap-2.5 text-violet-300 text-xs">
            <User className="w-4 h-4 text-fuchsia-400" />
            <span className="text-violet-200/80">Account Name</span>
          </div>
          <span className="text-xs font-semibold text-white">{user?.name || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-950/50 border border-violet-500/20">
          <div className="flex items-center gap-2.5 text-violet-300 text-xs">
            <Mail className="w-4 h-4 text-fuchsia-400" />
            <span className="text-violet-200/80">Email</span>
          </div>
          <span className="text-xs font-semibold text-white">{user?.email || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-950/50 border border-violet-500/20">
          <div className="flex items-center gap-2.5 text-violet-300 text-xs">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span className="text-violet-200/80">JWT Security Token</span>
          </div>
          <span className="text-xs font-mono text-violet-300/90">
            {token ? `${token.substring(0, 10)}...${token.substring(token.length - 8)}` : 'Verified'}
          </span>
        </div>
      </div>

      {/* Feature notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-900/30 via-purple-900/30 to-fuchsia-900/30 border border-violet-500/20 mb-8 flex items-start gap-3">
        <FileText className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-200/80 leading-relaxed">
          Authentication successful! Your session is active and isolated. You are ready to create, organize, and manage notes in your workspace.
        </p>
      </div>

      {/* Logout Action */}
      <button
        type="button"
        id="auth-logout-btn"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full py-3.5 px-4 rounded-2xl font-semibold text-sm text-white bg-violet-950/80 hover:bg-rose-950/70 border border-violet-500/30 hover:border-rose-500/50 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
      >
        {isLoggingOut ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            <span>Logging out...</span>
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Log Out</span>
          </>
        )}
      </button>
    </div>
  );
}
