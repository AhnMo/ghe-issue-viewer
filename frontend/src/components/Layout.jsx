import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Key, User, LogOut } from 'lucide-react';

export const Layout = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem('ghe_pat') || '');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('ghe_pat', token);
      fetchUser();
    } else {
      setUserInfo(null);
    }
  }, [token]);

  const fetchUser = async () => {
    setLoadingUser(true);
    try {
      const response = await fetch('/api/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        setUserInfo(null);
      }
    } catch (err) {
      setUserInfo(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    sessionStorage.removeItem('ghe_pat');
    setUserInfo(null);
    setShowTokenInput(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f6f8fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif' }}>
      {/* GitHub-style Header */}
      <header style={{ backgroundColor: '#24292f', padding: '16px 32px' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 text-white hover:opacity-80 transition-opacity">
            <svg height="32" viewBox="0 0 16 16" width="32" fill="white">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            <span className="font-semibold text-lg">GHE Issue Viewer</span>
          </Link>
          
          {/* User / Token Section */}
          <div className="flex items-center gap-3">
            {userInfo ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-2 text-white">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: getAvatarColor(userInfo.login), color: '#ffffff' }}
                  >
                    {getInitials(userInfo.login)}
                  </div>
                  <span className="text-sm font-medium">{userInfo.login}</span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-white/10"
                  style={{ color: '#8b949e' }}
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
                  style={{ 
                    backgroundColor: loadingUser ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }}
                >
                  {loadingUser ? (
                    <>
                      <span className="animate-spin">⏳</span> Verifying...
                    </>
                  ) : (
                    <>
                      <Key size={14} />
                      Set Token
                    </>
                  )}
                </button>
                
                {showTokenInput && (
                  <div 
                    className="absolute right-0 top-full mt-2 p-3 rounded-md border shadow-lg z-50"
                    style={{ backgroundColor: '#ffffff', borderColor: '#d0d7de', width: '300px' }}
                  >
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1f2328' }}>
                      Personal Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-md border outline-none"
                      style={{ borderColor: '#d0d7de', backgroundColor: '#f6f8fa' }}
                    />
                    <p className="mt-2 text-xs" style={{ color: '#656d76' }}>
                      Token is stored in sessionStorage
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-xs border-t" style={{ borderColor: '#d0d7de', color: '#656d76' }}>
        <p>GHE Issue Viewer · Built with React & FastAPI</p>
      </footer>
    </div>
  );
};

// Shared utilities
export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getInitials = (name) => {
  return name?.slice(0, 2).toUpperCase() || '??';
};

export const getAvatarColor = (name) => {
  const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  const index = name?.charCodeAt(0) % colors.length || 0;
  return colors[index];
};

export const getToken = () => sessionStorage.getItem('ghe_pat') || '';

