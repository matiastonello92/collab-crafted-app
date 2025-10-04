'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Activity, CheckCircle2 } from 'lucide-react';

const SystemHealthWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

  return (
    <WidgetContainer 
      title="dashboard.widgets.systemHealth"
      description="dashboard.widgets.systemHealthDesc"
      size={size}
    >
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <div className="p-3 rounded-full bg-green-500/10">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{t('dashboard.systemOperational')}</p>
          <p className="text-sm text-muted-foreground">{t('dashboard.allServicesRunning')}</p>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
    </WidgetContainer>
  );
};

export default SystemHealthWidget;
