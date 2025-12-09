'use client';

import Image from 'next/image';
import { useEffect, useRef, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useHydratedStore, useHydratedContext } from '@/lib/store/useHydratedStore';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTranslation } from '@/lib/i18n';
import { GlobalSearchCommand } from '@/components/search/GlobalSearchCommand';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { NotificationsBell } from '@/components/nav/NotificationsBell';

export default function HeaderClient({
  locations,
  activeLocationId,
  persisted,
  errorMessage,
  setActiveLocation,
}: {
  locations: { id: string; name: string; org_id: string }[];
  activeLocationId: string | null;
  persisted: boolean;
  errorMessage?: string;
  setActiveLocation: (id?: string | null) => Promise<void>;
}) {
  const { t } = useTranslation()
  const router = useRouter();
  const [, startTransition] = useTransition();
  const didPersistRef = useRef(false);
  const context = useHydratedContext();
  const { setContext } = useHydratedStore();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffectivePermissions();

  // Initialize user_id and org_id from active location
  useEffect(() => {
    const active = locations.find(l => l.id === activeLocationId) || null;
    
    // Get user_id from session (will be available after auth)
    const getUserId = async () => {
      try {
        const response = await fetch('/api/qa/session');
        const data = await response.json();
        return data.user?.id || null;
      } catch {
        return null;
      }
    };
    
    getUserId().then(userId => {
      console.log('📍 [HEADER] Setting full context:', {
        org_id: active?.org_id ?? null,
        user_id: userId,
        location_id: active?.id ?? null,
        location_name: active?.name ?? null
      });
      
      setContext({
        org_id: active?.org_id ?? null,
        user_id: userId,
        location_id: active?.id ?? null,
        location_name: active?.name ?? null,
      });
      
      console.log('✅ [HEADER] Context updated successfully');
    });
  }, [locations, activeLocationId, setContext]);

  // Auto-persist della default location quando il server ha scelto ma il cookie non c'è
  useEffect(() => {
    if (!didPersistRef.current && activeLocationId && !persisted) {
      didPersistRef.current = true;
      startTransition(async () => {
        await setActiveLocation(activeLocationId);
        // No router.refresh() on auto-persist to avoid race conditions
      });
    }
  }, [activeLocationId, persisted, setActiveLocation]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, []);

  const onSelect = (id: string) => {
    startTransition(async () => {
      await setActiveLocation(id);
      router.refresh();
    });
  };

  // Find active location for mobile indicator
  const activeLocation = locations.find(l => l.id === activeLocationId);

  // --- RENDER ---
  return (
    <div className="flex w-full items-center justify-between gap-3">
      {/* Left: Active location indicator (mobile only) + Error messages */}
      <div className="flex items-center gap-2">
        {activeLocation && (
          <div className="flex items-center gap-1.5 lg:hidden">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {activeLocation.name}
            </span>
          </div>
        )}
        
        {errorMessage ? (
          <span className="inline-flex items-center rounded-full border border-klyra-warning/40 bg-klyra-warning/10 px-2 py-1 text-xs font-medium text-klyra-warning sm:px-3">
            {errorMessage}
          </span>
        ) : !locations?.length ? (
          <span className="inline-flex items-center rounded-full border border-muted/50 bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground sm:px-3">
            {t('header.noLocation')}
          </span>
        ) : null}
      </div>
      
      <div className="flex-1 hidden lg:block" />
      
      {/* Right: Search + Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="relative justify-start text-sm text-muted-foreground h-10 rounded-xl border-border/60 bg-background/95 backdrop-blur-sm hover:bg-accent/50 transition-all duration-200 md:w-48 w-auto md:px-4 px-2"
            >
              <Search className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t('common.search')}</span>
              <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded-md border border-border/60 bg-muted/80 px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={8}
            className="w-[calc(100vw-2rem)] md:w-[600px] max-h-[600px] p-0 overflow-hidden rounded-2xl shadow-2xl border border-border/40 bg-background/95 backdrop-blur-xl"
          >
            <GlobalSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
          </PopoverContent>
        </Popover>

        {/* Theme + Language + Notifications + User */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <NotificationsBell />
          <UserDropdown />
        </div>
      </div>
    </div>
  );
}
