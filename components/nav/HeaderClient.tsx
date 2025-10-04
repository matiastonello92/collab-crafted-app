'use client';

import Image from 'next/image';
import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useHydratedStore, useHydratedContext } from '@/lib/store/useHydratedStore';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTranslation } from '@/lib/i18n';

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

  const onSelect = (id: string) => {
    startTransition(async () => {
      await setActiveLocation(id);
      router.refresh();
    });
  };

  // --- RENDER ---
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Row 1: Logo + Status */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm">
          <Image src="/brand/klyra-icon.svg" alt="Klyra" width={28} height={28} className="size-6 sm:size-7" priority />
          <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Klyra</span>
        </div>
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

      {/* Row 2: Location + Theme + User */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {locations?.length ? (
          <div className="relative flex-1 sm:flex-none">
            <select
              className="focus-enhanced h-11 w-full min-w-[160px] rounded-xl border border-border/60 bg-background px-3 text-sm font-medium text-foreground shadow-sm transition sm:h-10 sm:min-w-[180px] sm:px-4"
              value={activeLocationId ?? ''}
              onChange={event => onSelect(event.target.value)}
              aria-label={t('header.selectLocation')}
            >
              {locations.map(location => (
                <option key={location.id} value={location.id} className="bg-background text-foreground">
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/80 px-1.5 py-1 shadow-sm">
          <ThemeToggle />
          <span className="h-6 w-px rounded-full bg-border/60" aria-hidden="true" />
          <UserDropdown />
        </div>
      </div>
    </div>
  );
}
