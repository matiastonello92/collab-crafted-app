import { cookies } from 'next/headers';
import { getAuthSnapshot } from '@/lib/server/auth-snapshot';
import { setActiveLocationAction } from '@/app/actions/active-location';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const { locations, activeLocationId, permissions } = await getAuthSnapshot();
  const persisted = !!(await cookies()).get('pn_loc');

  return (
    <HeaderClient
      locations={locations}
      activeLocationId={activeLocationId}
      persisted={persisted}
      errorMessage={undefined}
      permissions={permissions}
      setActiveLocation={setActiveLocationAction}
    />
  );
}
