import HeaderClient from './HeaderClient';
import { getAuthSnapshot } from '@/lib/server/authContext';
import { setActiveLocationAction } from '@/app/actions/active-location';

export default async function Header() {
  const snap = await getAuthSnapshot();

  return (
    <HeaderClient
      locations={snap.locations}
      activeLocationId={snap.activeLocationId}
      persisted={true}
      errorMessage={snap.locations.length ? undefined : 'Nessuna sede assegnata'}
      setActiveLocation={setActiveLocationAction}
    />
  );
}

