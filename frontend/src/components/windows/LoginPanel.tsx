'use client';

import { SignIn, SignUp, useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { clerkEnabled } from '@/lib/clerk-config';

export default function LoginPanel() {
  if (!clerkEnabled) {
    return (
      <div className="p-4 bg-retro-window h-full">
        <div className="retro-panel-inset p-3 text-[11px] text-gray-700">
          Clerk is not configured yet. Add a real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to enable sign-in.
        </div>
      </div>
    );
  }

  const { isSignedIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="p-4 bg-retro-window h-full">
      <div className="retro-panel-inset p-3 mb-3">
        <h2 className="font-pixel text-[10px] text-retro-title mb-1">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-[10px] text-gray-600">
          {mode === 'login' ? 'Sign in with Clerk to play online' : 'Create a new Clerk account'}
        </p>
      </div>

      {isSignedIn ? (
        <div className="retro-panel-inset p-3 text-[11px] text-gray-700">
          You are signed in. Close this window to continue.
        </div>
      ) : mode === 'login' ? (
        <div className="clerk-retro-shell">
          <SignIn
            routing="hash"
            signUpUrl="#sign-up"
            appearance={{
              elements: {
                card: 'shadow-none border-0 bg-transparent',
                rootBox: 'w-full',
              },
            }}
          />
        </div>
      ) : (
        <div className="clerk-retro-shell">
          <SignUp
            routing="hash"
            signInUrl="#sign-in"
            appearance={{
              elements: {
                card: 'shadow-none border-0 bg-transparent',
                rootBox: 'w-full',
              },
            }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <button
          className="text-[10px] text-retro-title underline cursor-pointer bg-transparent border-none text-left"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}
