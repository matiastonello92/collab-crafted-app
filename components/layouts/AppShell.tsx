import { Suspense } from 'react';
import Header from '@/components/nav/Header';
import SidebarClient from '@/components/nav/SidebarClient';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Suspense fallback={null}>
        <SidebarClient />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Suspense fallback={<div className="h-16" />}>
            <Header />
          </Suspense>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}