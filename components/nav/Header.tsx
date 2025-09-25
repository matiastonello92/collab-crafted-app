import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { setActiveLocationAction } from '@/app/actions/active-location';
import HeaderClient from './HeaderClient';
import { ClientOnly } from '@/lib/hydration/ClientOnly';

export const dynamic = 'force-dynamic';

export default async function Header() {
  const { active, locations, persisted, meta } = await getActiveLocationServer();

  const errorMessage =
    meta?.error === 'memberships' ? 'Impossibile leggere le assegnazioni.'
    : meta?.error === 'locations' ? 'Impossibile leggere le sedi.'
    : meta?.error === 'fatal' ? 'Errore inatteso.'
    : undefined;

  return (
    <ClientOnly fallback={<div className="h-10 w-full" />}>
      <HeaderClient
        locations={locations}
        activeLocationId={active?.id ?? null}
        persisted={persisted}
        errorMessage={errorMessage}
        setActiveLocation={setActiveLocationAction}
      />
    </ClientOnly>
  );
}
