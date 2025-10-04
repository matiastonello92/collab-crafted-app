'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { getUserLevel, getVisibleWidgets, canAccessWidget } from '@/lib/dashboard/widget-selector';
import { getAllWidgets } from '@/lib/dashboard/widget-registry';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardSettingsClient() {
  const { t } = useTranslation();
  const { permissions, isAdmin } = usePermissions();
  const { preferences, updateWidget, isLoading } = useDashboardWidgets();

  const userLevel = getUserLevel(isAdmin, permissions);
  const allWidgets = getAllWidgets();

  const handleToggle = async (widgetId: string, isVisible: boolean) => {
    await updateWidget(widgetId, { is_visible: isVisible });
    toast.success(t('dashboard.widgetUpdated'));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.settings.description')}
        </p>
      </div>

      <div className="space-y-4">
        {allWidgets.map((widget) => {
          const hasAccess = canAccessWidget(widget, userLevel, permissions);
          const preference = preferences.find(p => p.widget_id === widget.id);
          const isVisible = preference?.is_visible ?? widget.defaultVisible;

          return (
            <Card key={widget.id} className={!hasAccess ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{t(widget.title)}</CardTitle>
                      {!hasAccess && (
                        <Badge variant="secondary" className="text-xs">
                          {t('dashboard.settings.locked')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {t(widget.description)}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={isVisible && hasAccess}
                    disabled={!hasAccess}
                    onCheckedChange={(checked) => handleToggle(widget.id, checked)}
                  />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">
          {t('dashboard.settings.hint')}
        </p>
      </div>
    </div>
  );
}
