import { cookies } from 'next/headers';

import { setActiveLocation } from '@/app/actions/active-location';
import type { HydrationPayload } from '@/lib/store';
import HeaderClient from './HeaderClient';

export default async function Header({ state }: { state: HydrationPayload }) {
  const jar = await cookies();
  const persistedId = jar.get('pn_loc')?.value ?? null;
  const activeLocationId = state.location?.id ?? null;
  const persisted = !activeLocationId || activeLocationId === persistedId;

  return (
    <HeaderClient
      locations={state.availableLocations}
      activeLocationId={activeLocationId}
      persisted={persisted}
      setActiveLocation={setActiveLocation}
    />
  );
}
