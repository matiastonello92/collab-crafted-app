import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { setActiveLocationAction } from '@/app/actions/active-location';
import SidebarClient from './SidebarClient';
import { ClientOnly } from '@/lib/hydration/ClientOnly';

export default async function SidebarWrapper() {
  const { active, locations } = await getActiveLocationServer();

  return (
    <ClientOnly fallback={<aside className="min-h-dvh w-64 border-r border-border/60 bg-card" />}>
      <SidebarClient
        locations={locations}
        activeLocationId={active?.id ?? null}
        setActiveLocation={setActiveLocationAction}
      />
    </ClientOnly>
  );
}
