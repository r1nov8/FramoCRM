
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from './context/DataContext';
import { AuthForm } from './components/AuthForm';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const Root: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<{ name: string; initials: string; role?: string } | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleAuthSuccess = (jwt: string, userInfo: { name: string; initials: string; role?: string }) => {
    setToken(jwt);
    setUser(userInfo);
    localStorage.setItem('token', jwt);
    localStorage.setItem('user', JSON.stringify(userInfo));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expired');
  };

  // Graceful 401: listen for event and force logout with a small prompt
  React.useEffect(() => {
    const onExpired = () => {
      try { localStorage.setItem('token_expired', '1'); } catch {}
      setSessionExpired(true);
      handleLogout();
    };
    window.addEventListener('crm:auth-expired', onExpired);
    return () => window.removeEventListener('crm:auth-expired', onExpired);
  }, []);

  if (!token || !user) {
    return (
      <>
        {sessionExpired && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-amber-100 text-amber-900 px-4 py-2 rounded shadow">
            Session expired. Please sign in again.
          </div>
        )}
        <AuthForm onAuthSuccess={(jwt, u) => { setSessionExpired(false); handleAuthSuccess(jwt, u); }} />
      </>
    );
  }

  return (
    <DataProvider>
      <RefreshUser user={user} onUser={(u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }} />
      <App user={user} onLogout={handleLogout} />
    </DataProvider>
  );
};

// Component to refresh user profile from backend once after mount
const RefreshUser: React.FC<{ user: { name: string; initials: string; role?: string } | null, onUser: (u: any) => void }> = ({ onUser }) => {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = (window as any).API_URL || window.location.origin;
        const t = localStorage.getItem('token');
        if (!t) return;
        const res = await fetch(`${base}/api/me`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) return;
        const data = await res.json();
        const u = data?.user;
        if (!cancelled && u) onUser(u);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [onUser]);
  return null;
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);