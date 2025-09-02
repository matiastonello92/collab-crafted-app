import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { setActiveLocationAction } from '@/app/actions/active-location';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const { active, locations } = await getActiveLocationServer();
  return (
    <HeaderClient
      locations={locations}
      activeLocationId={active?.id ?? null}
      setActiveLocation={setActiveLocationAction}
    />
  );
}
