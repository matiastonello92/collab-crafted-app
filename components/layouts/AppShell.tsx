import { Suspense } from 'react';
import Header from '@/components/nav/Header';
import SidebarClient from '@/components/nav/SidebarClient';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Suspense fallback={<aside className="hidden min-h-dvh w-64 border-r border-border/60 bg-card lg:block" />}> 
        <SidebarClient />
      </Suspense>
      <div className="flex min-h-dvh flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center px-4 py-3 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="h-10 w-full" />}>
              <Header />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}