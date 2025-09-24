'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { AppBootstrap } from '@/types/app-bootstrap';

export default function HeaderClient({
  locations,
  activeLocationId,
  persisted,
  errorMessage,
  setActiveLocation,
}: {
  locations: { id: string; name: string }[];
  activeLocationId: string | null;
  persisted: boolean;
  errorMessage?: string;
  setActiveLocation: (id?: string | null) => Promise<AppBootstrap>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const didPersistRef = useRef(false);
  const setContext = useAppStore((state) => state.setContext);
  const hydrate = useAppStore((state) => state.hydrate);
  const setPermissionsLoading = useAppStore((state) => state.setPermissionsLoading);

  useEffect(() => {
    const active = locations.find((location) => location.id === activeLocationId) ?? null;
    setContext({
      location: active
        ? {
            id: active.id,
            name: active.name,
            city: '',
          }
        : null,
    });
  }, [locations, activeLocationId, setContext]);

  const syncLocation = useCallback(
    async (locationId?: string | null, navigate = false) => {
      setPermissionsLoading(true);
      try {
        const payload = await setActiveLocation(locationId);
        if (payload) {
          hydrate(payload);
        }
        if (navigate) {
          router.replace(pathname);
        }
      } finally {
        setPermissionsLoading(false);
      }
    },
    [hydrate, pathname, router, setActiveLocation, setPermissionsLoading],
  );

  useEffect(() => {
    if (!didPersistRef.current && activeLocationId && !persisted) {
      didPersistRef.current = true;
      startTransition(() => {
        void syncLocation(activeLocationId, false);
      });
    }
  }, [activeLocationId, persisted, syncLocation]);

  const onSelect = (id: string) => {
    startTransition(() => {
      void syncLocation(id, true);
    });
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm">
          <Image src="/brand/klyra-icon.svg" alt="Klyra" width={28} height={28} className="size-7" priority />
          <span className="text-lg font-semibold tracking-tight text-foreground">Klyra</span>
        </div>
        {errorMessage ? (
          <span className="inline-flex items-center rounded-full border border-klyra-warning/40 bg-klyra-warning/10 px-3 py-1 text-xs font-medium text-klyra-warning">
            {errorMessage}
          </span>
        ) : !locations?.length ? (
          <span className="inline-flex items-center rounded-full border border-muted/50 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            Nessuna sede assegnata
          </span>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {locations?.length ? (
          <div className="relative">
            <select
              className="h-10 min-w-[180px] rounded-xl border border-border/60 bg-background px-4 text-sm font-medium text-foreground shadow-sm transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={activeLocationId ?? ''}
              onChange={(event) => onSelect(event.target.value)}
              aria-label="Seleziona sede attiva"
            >
              {locations.map((location) => (
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
