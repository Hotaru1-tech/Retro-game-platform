'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPanel() {
  const { login, register, loginAsGuest, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(username, email, password);
    }
  };

  return (
    <div className="p-4 bg-retro-window h-full">
      <div className="retro-panel-inset p-3 mb-3">
        <h2 className="font-pixel text-[10px] text-retro-title mb-1">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-[10px] text-gray-600">
          {mode === 'login' ? 'Sign in to play games' : 'Register a new account'}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-800 text-[10px] px-2 py-1 mb-2" onClick={clearError}>
          {error} (click to dismiss)
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <div>
            <label className="text-[11px] block mb-0.5">Username:</label>
            <input
              className="retro-input w-full"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>
        )}

        <div>
          <label className="text-[11px] block mb-0.5">Email:</label>
          <input
            type="email"
            className="retro-input w-full"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-[11px] block mb-0.5">Password:</label>
          <input
            type="password"
            className="retro-input w-full"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="retro-button font-bold flex-1" disabled={isLoading}>
            {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-col gap-2">
        <button
          className="text-[10px] text-retro-title underline cursor-pointer bg-transparent border-none text-left"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign In'}
        </button>

        <div className="border-t border-gray-400 pt-2">
          <button className="retro-button w-full text-[10px]" onClick={loginAsGuest} disabled={isLoading}>
            Play as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
