
import { API_URL } from '../hooks/useCrmData';
import React, { useState } from 'react';

interface AuthFormProps {
  onAuthSuccess: (token: string, user: { name: string; initials: string }) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const base = API_URL;
      if (mode === 'register') {
        // Create the user first
        const regRes = await fetch(`${base}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!regRes.ok) {
          const regTxt = await regRes.text().catch(() => '');
          let msg = 'Registration failed';
          try { const j = JSON.parse(regTxt); if (j?.error) msg = j.error; } catch {}
          throw new Error(`${msg}${regTxt ? ` (${regRes.status})` : ''}`);
        }
      }
      // Then login to obtain JWT and user info
      const res = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        let msg = 'Login failed';
        try { const j = JSON.parse(txt); if (j?.error) msg = j.error; } catch {}
        throw new Error(`${msg}${res.status ? ` (${res.status})` : ''}`);
      }
      const text = await res.text();
      // Some platforms can strip JSON headers; try parsing safely
      let data: any = {};
      try {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = JSON.parse(text || '{}');
        } else {
          data = JSON.parse(text);
        }
      } catch {
        const snippet = (text || '').slice(0, 160).replace(/\s+/g, ' ').trim();
        throw new Error(snippet ? `Unexpected response: ${snippet}` : 'Unexpected response from server');
      }
      onAuthSuccess(data.token, data.user || { name: username, initials: username.slice(0, 2).toUpperCase() });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-800">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-sm flex flex-col items-center"
      >
        <img src="/framo-logo.png" alt="Framo Logo" className="h-16 mb-4" />
  <h2 className="text-2xl font-bold mb-2 text-center text-blue-800 dark:text-blue-200">{mode === 'login' ? 'Sign in to Framo CRM' : 'Create your account'}</h2>
  <p className="mb-6 text-gray-500 text-center">{mode === 'login' ? 'Welcome back! Please sign in to your account.' : 'Create an account to continue.'}</p>
        <input
          className="w-full mb-3 p-3 border border-blue-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          className="w-full mb-3 p-3 border border-blue-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-2"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          className="text-blue-600 hover:underline text-sm"
          type="button"
          onClick={() => setMode(m => (m === 'login' ? 'register' : 'login'))}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </form>
      <div className="mt-6 text-gray-400 text-xs text-center">&copy; {new Date().getFullYear()} Framo. All rights reserved.</div>
    </div>
  );
};
