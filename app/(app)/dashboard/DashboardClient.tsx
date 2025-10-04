'use client';

import { Suspense } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { getUserLevel, getVisibleWidgets } from '@/lib/dashboard/widget-selector';
import { WidgetSkeleton } from '@/components/dashboard/WidgetSkeleton';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function DashboardClient() {
  const { t } = useTranslation();
  const { permissions, isAdmin, isLoading: permissionsLoading } = usePermissions();
  const { preferences, isLoading: widgetsLoading } = useDashboardWidgets();

  if (permissionsLoading || widgetsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WidgetSkeleton size="large" />
          <WidgetSkeleton size="medium" />
          <WidgetSkeleton size="small" />
        </div>
      </div>
    );
  }

  const userLevel = getUserLevel(isAdmin, permissions);
  const visibleWidgets = getVisibleWidgets(userLevel, permissions, preferences);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.welcome')}</h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
        </div>
        <Link href="/settings/dashboard">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {t('dashboard.customize')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWidgets.map((widget) => {
          const WidgetComponent = widget.component;
          const size = widget.preference?.size || widget.defaultSize;
          const config = widget.preference?.config || {};

          return (
            <Suspense key={widget.id} fallback={<WidgetSkeleton size={size} />}>
              <WidgetComponent size={size} config={config} />
            </Suspense>
          );
        })}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('dashboard.noWidgets')}</p>
          <Link href="/settings/dashboard">
            <Button className="mt-4">
              {t('dashboard.addWidgets')}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
