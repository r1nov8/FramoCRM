
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
      // Check if mock mode is enabled
      const mockMode = String((import.meta as any).env?.VITE_MOCK_MODE ?? '').toLowerCase().trim();
      const isMockMode = mockMode === '1' || mockMode === 'true' || mockMode === 'yes';
      
      if (isMockMode) {
        // Mock authentication - just return success with fake user
        setTimeout(() => {
          onAuthSuccess('mock-token', { 
            name: username || 'Mock User', 
            initials: (username || 'MU').slice(0, 2).toUpperCase() 
          });
          setLoading(false);
        }, 500); // Simulate network delay
        return;
      }
      
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      if (mode === 'register') {
        // Create the user first
        const regRes = await fetch(`${base}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.error || 'Registration failed');
      }
      // Then login to obtain JWT and user info
      const res = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
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
