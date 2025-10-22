import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { setActiveLocationAction } from '@/app/actions/active-location';
import HeaderClient from './HeaderClient';
import { MobileSidebar } from '../layouts/MobileSidebar';
import { ClientOnly } from '@/lib/hydration/ClientOnly';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function Header() {
  const { active, locations, persisted, meta } = await getActiveLocationServer();

  const errorMessage =
    meta?.error === 'memberships' ? t('header.errorMemberships')
    : meta?.error === 'locations' ? t('header.errorLocations')
    : meta?.error === 'fatal' ? t('header.errorFatal')
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
      {/* Mobile Menu Button */}
      <MobileSidebar
        locations={locations}
        activeLocationId={active?.id ?? null}
        setActiveLocation={setActiveLocationAction}
      />

      <ClientOnly fallback={<div className="h-10 w-full" />}>
        <HeaderClient
          locations={locations}
          activeLocationId={active?.id ?? null}
          persisted={persisted}
          errorMessage={errorMessage}
          setActiveLocation={setActiveLocationAction}
        />
      </ClientOnly>
    </div>
  );
}
