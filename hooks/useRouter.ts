'use client';
import { useRouter as useNextRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Enhanced router hook that replaces window.location.href with proper Next.js navigation
 */
export function useRouter() {
  const router = useNextRouter();

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const replaceTo = useCallback((path: string) => {
    router.replace(path);
  }, [router]);

  return {
    ...router,
    navigateTo,
    replaceTo,
  };
}