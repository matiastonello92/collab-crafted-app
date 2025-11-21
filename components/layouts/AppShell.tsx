import { Suspense } from 'react';
import Header from '@/components/nav/Header';
import SidebarWrapper from '@/components/nav/SidebarWrapper';
import { ClientOnly } from '@/lib/hydration/ClientOnly';
import { BottomNav } from '@/components/nav/BottomNav';
import { MobileSidebar } from './MobileSidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground pt-safe">
      {/* DESKTOP: Sidebar FIXED */}
      <Suspense fallback={<aside className="hidden h-screen w-64 border-r border-border/60 bg-card lg:block" />}>
        <div className="hidden lg:block sticky top-0 h-screen">
          <SidebarWrapper />
        </div>
      </Suspense>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Suspense fallback={<div className="h-10 w-full" />}>
            <Header />
          </Suspense>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/10 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}