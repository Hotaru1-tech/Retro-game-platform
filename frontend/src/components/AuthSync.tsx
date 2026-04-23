'use client';

import { useEffect } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/nextjs';
import { useAuthStore } from '@/stores/auth.store';
import { configureAuthRuntime } from '@/lib/auth-runtime';
import { clerkEnabled } from '@/lib/clerk-config';

export default function AuthSync() {
  if (!clerkEnabled) {
    return <AuthSyncDisabled />;
  }

  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const {
    setClerkState,
    fetchProfile,
    clearSession,
  } = useAuthStore();

  useEffect(() => {
    configureAuthRuntime({
      getToken: async () => {
        if (!isLoaded || !isSignedIn) return null;
        return getToken();
      },
      logout: async () => {
        await signOut();
      },
    });
  }, [getToken, isLoaded, isSignedIn, signOut]);

  useEffect(() => {
    setClerkState({ isClerkLoaded: isLoaded, isAuthenticated: !!isSignedIn });
    if (!isLoaded) return;

    if (isSignedIn) {
      void fetchProfile(clerkUser?.fullName || clerkUser?.username || undefined);
      return;
    }

    clearSession();
  }, [clearSession, clerkUser?.fullName, clerkUser?.username, fetchProfile, isLoaded, isSignedIn, setClerkState]);

  return null;
}

function AuthSyncDisabled() {
  const { clearSession, setClerkState } = useAuthStore();

  useEffect(() => {
    configureAuthRuntime({
      getToken: async () => null,
      logout: async () => {},
    });
    clearSession();
    setClerkState({ isClerkLoaded: true, isAuthenticated: false });
  }, [clearSession, setClerkState]);

  return null;
}
