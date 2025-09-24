'use client';
import { useRouter as useNextRouter } from 'next/navigation';

/**
 * Enhanced router hook that replaces window.location.href with proper Next.js navigation
 */
export function useRouter() {
  const router = useNextRouter();

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const replaceTo = (path: string) => {
    router.replace(path);
  };

  return {
    ...router,
    navigateTo,
    replaceTo,
  };
}