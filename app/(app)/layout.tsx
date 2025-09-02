import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Header from '@/components/nav/Header';
import SidebarClient from '@/components/nav/SidebarClient';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Suspense fallback={null}>
        <SidebarClient />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-screen-2xl px-4">
            <Suspense fallback={<div className="h-14" />}>
              {/* @ts-expect-error Async Server Component */}
              <Header />
            </Suspense>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
