import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { setActiveLocationAction } from '@/app/actions/active-location';
import HeaderClient from './HeaderClient';

export default async function Header() {
  try {
    const { active, locations, persisted } = await getActiveLocationServer();
    return (
      <HeaderClient
        locations={locations}
        activeLocationId={active?.id ?? null}
        persisted={persisted}
        setActiveLocation={setActiveLocationAction}
      />
    );
  } catch (err) {
    console.error('[Header] render fatal', err);
    return (
      <HeaderClient
        locations={[]}
        activeLocationId={null}
        persisted={false}
        setActiveLocation={async () => {}}
      />
    );
  }
}
