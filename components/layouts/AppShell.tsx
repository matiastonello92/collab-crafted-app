'use client';

import { Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import Header from '@/components/nav/Header';
import SidebarClient from '@/components/nav/SidebarClient';
import { ClientOnly } from '@/lib/hydration/ClientOnly';
import { BottomNav } from '@/components/nav/BottomNav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* MOBILE: Sheet Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <button className="sr-only" aria-label="Toggle mobile menu" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 lg:hidden">
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-card" />}>
            <ClientOnly fallback={<div className="h-full w-full bg-card" />}>
              <SidebarClient onNavigate={() => setMobileMenuOpen(false)} />
            </ClientOnly>
          </Suspense>
        </SheetContent>
      </Sheet>

      {/* DESKTOP: Sidebar normale */}
      <Suspense fallback={<aside className="hidden min-h-dvh w-64 border-r border-border/60 bg-card lg:block" />}>
        <ClientOnly fallback={<aside className="hidden min-h-dvh w-64 border-r border-border/60 bg-card lg:block" />}>
          <div className="hidden lg:block">
            <SidebarClient />
          </div>
        </ClientOnly>
      </Suspense>

      <div className="flex min-h-dvh flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Apri menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Suspense fallback={<div className="h-10 w-full" />}>
              <Header />
            </Suspense>
          </div>
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