import { Suspense } from 'react';
import Header from '@/components/nav/Header';
import SidebarWrapper from '@/components/nav/SidebarWrapper';
import { ClientOnly } from '@/lib/hydration/ClientOnly';
import { BottomNav } from '@/components/nav/BottomNav';
import { MobileSidebar } from './MobileSidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* DESKTOP: Sidebar normale */}
      <Suspense fallback={<aside className="hidden min-h-dvh w-64 border-r border-border/60 bg-card lg:block" />}>
        <div className="hidden lg:block">
          <SidebarWrapper />
        </div>
      </Suspense>

      <div className="flex min-h-dvh flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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