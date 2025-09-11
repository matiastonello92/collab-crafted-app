'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useAppStore } from '@/lib/store';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { ThemeToggle } from '@/components/ui/theme-toggle';

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
  setActiveLocation: (id?: string | null) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const didPersistRef = useRef(false);
  const setContext = useAppStore(state => state.setContext);
  useEffectivePermissions();

  useEffect(() => {
    const active = locations.find(l => l.id === activeLocationId) || null;
    const prev = useAppStore.getState().context;
    setContext({
      ...prev,
      location_id: active?.id ?? null,
      location_name: active?.name ?? null,
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
    <div className="h-14 flex items-center justify-between gap-4">
      {/* Left: brand + state */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/brand/klyra-icon.svg" alt="Klyra" className="h-8 w-8" />
            <span className="font-bold text-xl bg-gradient-to-r from-klyra-primary to-klyra-accent bg-clip-text text-transparent">
              Klyra
            </span>
          </div>
        </div>

        {errorMessage ? (
          <span className="text-xs rounded-full px-3 py-1 border border-klyra-warning/40 bg-klyra-warning/10 text-klyra-warning">
            {errorMessage}
          </span>
        ) : !locations?.length ? (
          <span className="text-xs rounded-full px-3 py-1 border border-klyra-muted/30 bg-klyra-muted/10 text-klyra-muted">
            Nessuna sede assegnata
          </span>
        ) : null}
      </div>

      {/* Right: location switcher + theme toggle + avatar menu */}
      <div className="flex items-center gap-3">
        {locations?.length ? (
          <select
            className="text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground hover:bg-accent transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            value={activeLocationId ?? ''}
            onChange={e => onSelect(e.target.value)}
          >
            {locations.map(location => (
              <option key={location.id} value={location.id} className="bg-background text-foreground">
                {location.name}
              </option>
            ))}
          </select>
        ) : null}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Avatar menu già esistente: Profilo / Settings / Logout */}
        <UserDropdown />
      </div>
    </div>
  );
}
