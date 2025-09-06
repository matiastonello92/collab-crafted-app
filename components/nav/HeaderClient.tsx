'use client';

import { useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserDropdown } from '@/components/nav/UserDropdown';
import { useAppStore } from '@/lib/store';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';

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
      <div className="flex items-center gap-3">
        <div className="font-semibold">Pecora APP</div>

        {errorMessage ? (
          <span className="text-xs rounded-full px-2 py-1 border border-amber-500/40 bg-amber-500/10">
            {errorMessage}
          </span>
        ) : !locations?.length ? (
          <span className="text-xs rounded-full px-2 py-1 border border-slate-300/50">
            Nessuna sede assegnata
          </span>
        ) : null}
      </div>

      {/* Right: location switcher (solo se ci sono location) + avatar menu */}
      <div className="flex items-center gap-3">
        {locations?.length ? (
          <select
            className="text-sm border rounded px-2 py-1"
            value={activeLocationId ?? ''}
            onChange={e => onSelect(e.target.value)}
          >
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        ) : null}

        {/* Avatar menu già esistente: Profilo / Settings / Logout */}
        <UserDropdown />
      </div>
    </div>
  );
}
