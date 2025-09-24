'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hardLogout } from '@/lib/hardLogout';
import { useAppStore } from '@/lib/store';

export function UserBadge() {
  const router = useRouter();
  const user = useAppStore((state) => state.context.user);

  const handleLogout = useCallback(async () => {
    await hardLogout();
    router.replace('/login');
  }, [router]);

  if (!user?.email) {
    return (
      <a href="/login" className="text-sm underline">
        Accedi
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{user.email}</span>
      <button onClick={handleLogout} className="px-2 py-1 rounded border">
        Logout
      </button>
    </div>
  );
}
