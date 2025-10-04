'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { TrendingUp, Users, Calendar, Package } from 'lucide-react';

const LocationStatsWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();

  const stats = [
    { label: t('dashboard.activeUsers'), value: '0', icon: Users },
    { label: t('dashboard.shiftsThisWeek'), value: '0', icon: Calendar },
    { label: t('dashboard.inventoriesOpen'), value: '0', icon: Package },
  ];

  return (
    <WidgetContainer 
      title="dashboard.widgets.locationStats"
      description="dashboard.widgets.locationStatsDesc"
      size={size}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className="p-2 rounded-full bg-primary/10">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
};

export default LocationStatsWidget;
