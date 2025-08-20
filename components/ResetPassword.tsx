import React, { useState } from 'react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Get token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setSuccess('Password has been reset. You may now log in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
        <p className="text-gray-500">Reset link is missing or invalid.</p>
      </div>
    </div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 dark:from-gray-900 dark:to-gray-800">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-sm flex flex-col items-center">
        <img src="/framo-logo.png" alt="Framo Logo" className="h-16 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-center text-blue-800 dark:text-blue-200">Reset Password</h2>
        <p className="mb-6 text-gray-500 text-center">Enter your new password below.</p>
        <input
          className="w-full mb-3 p-3 border border-blue-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          className="w-full mb-3 p-3 border border-blue-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
        {success && <div className="text-green-600 mb-2 text-center">{success}</div>}
        <button
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-2"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Reset Password'}
        </button>
      </form>
      <div className="mt-6 text-gray-400 text-xs text-center">&copy; {new Date().getFullYear()} Framo. All rights reserved.</div>
    </div>
  );
}
