'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useTransition } from 'react';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useAppStore, type HydrationPayload, type LocationInfo } from '@/lib/store';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function HeaderClient({
  locations,
  activeLocationId,
  persisted,
  setActiveLocation,
}: {
  locations: { id: string; name: string }[];
  activeLocationId: string | null;
  persisted: boolean;
  setActiveLocation: (id?: string | null) => Promise<HydrationPayload>;
}) {
  const [, startTransition] = useTransition();
  const didPersistRef = useRef(false);
  const updateContext = useAppStore((state) => state.updateContext);
  const availableLocations = useAppStore((state) => state.availableLocations);
  const currentLocationId = useAppStore((state) => state.location?.id ?? null);

  const fallbackLocations = useMemo<LocationInfo[]>(
    () => locations.map((location) => ({ id: location.id, name: location.name })),
    [locations]
  );

  const renderedLocations = availableLocations.length ? availableLocations : fallbackLocations;

  // Auto-persist della default location quando il server ha scelto ma il cookie non c'è
  useEffect(() => {
    if (!didPersistRef.current && activeLocationId && !persisted) {
      didPersistRef.current = true;
      startTransition(async () => {
        const next = await setActiveLocation(activeLocationId);
        updateContext(next);
      });
    }
  }, [activeLocationId, persisted, setActiveLocation, updateContext]);

  const onSelect = (id: string) => {
    startTransition(async () => {
      const next = await setActiveLocation(id);
      updateContext(next);
    });
  };

  // --- RENDER ---
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 shadow-sm">
          <Image src="/brand/klyra-icon.svg" alt="Klyra" width={28} height={28} className="size-7" priority />
          <span className="text-lg font-semibold tracking-tight text-foreground">Klyra</span>
        </div>
        {!renderedLocations?.length ? (
          <span className="inline-flex items-center rounded-full border border-muted/50 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            Nessuna sede assegnata
          </span>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {renderedLocations?.length ? (
          <div className="relative">
            <select
              className="h-10 min-w-[180px] rounded-xl border border-border/60 bg-background px-4 text-sm font-medium text-foreground shadow-sm transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={currentLocationId ?? activeLocationId ?? ''}
              onChange={event => onSelect(event.target.value)}
              aria-label="Seleziona sede attiva"
            >
              {renderedLocations.map(location => (
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
