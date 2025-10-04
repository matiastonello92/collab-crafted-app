'use client';

import { WidgetContainer } from '../WidgetContainer';
import { useTranslation } from '@/lib/i18n';
import { WidgetProps } from '@/lib/dashboard/types';
import { Users, Calendar, Package } from 'lucide-react';
import useSWR from 'swr';
import { useProfiles } from '@/hooks/useProfiles';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const LocationStatsWidget = ({ size }: WidgetProps) => {
  const { t } = useTranslation();
  const { profile } = useProfiles();
  const locationId = profile?.default_location_id;

  const { data, isLoading } = useSWR(
    locationId ? `/api/v1/locations/${locationId}/stats` : null,
    fetcher
  );

  const stats = [
    { 
      label: t('dashboard.activeUsers'), 
      value: data?.activeUsers?.toString() || '0', 
      icon: Users,
      loading: isLoading 
    },
    { 
      label: t('dashboard.shiftsThisWeek'), 
      value: data?.shiftsThisWeek?.toString() || '0', 
      icon: Calendar,
      loading: isLoading 
    },
    { 
      label: t('dashboard.inventoriesOpen'), 
      value: data?.inventoriesOpen?.toString() || '0', 
      icon: Package,
      loading: isLoading 
    },
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
              {stat.loading ? (
                <div className="h-8 w-12 rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </WidgetContainer>
  );
};

export default LocationStatsWidget;
