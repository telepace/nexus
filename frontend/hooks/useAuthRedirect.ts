"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/client-auth';

/**
 * Custom hook to handle redirection based on authentication status and setup completion.
 * This hook is intended for use in client-side components.
 */
export function useAuthRedirect() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Do nothing if authentication status is still loading
    if (isLoading) {
      return;
    }

    if (user) {
      // User is authenticated
      const callbackUrl = searchParams.get('callbackUrl');

      if (user.is_setup_complete === true) {
        // User has completed setup
        if (callbackUrl) {
          console.log(`[useAuthRedirect] Setup complete, redirecting to callbackUrl: ${callbackUrl}`);
          router.push(callbackUrl);
        } else {
          console.log('[useAuthRedirect] Setup complete, redirecting to /dashboard');
          router.push('/dashboard');
        }
      } else {
        // User has not completed setup, is_setup_complete is false or undefined
        // Middleware should ideally prevent authenticated users with incomplete setup from accessing
        // pages other than /setup. This redirection is an additional safeguard.
        console.log('[useAuthRedirect] User authenticated but setup not complete, redirecting to /setup');
        router.push('/setup');
      }
    }
    // If there's no user (not authenticated), this hook does nothing.
    // Pages that require authentication should be protected by the middleware,
    // which will redirect to /login.
    // Pages like /login or /register will use this hook to redirect *away* if the user *is* logged in.

  }, [user, isLoading, router, searchParams]);

  // This hook does not return anything as its purpose is to perform side effects (redirection).
}
