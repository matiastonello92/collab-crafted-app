'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Gauge, AlertCircle, Wrench } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface EquipmentClientProps {
  locationId: string;
}

export function EquipmentClient({ locationId }: EquipmentClientProps) {
  const { t } = useTranslation();
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['haccp-equipment', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_equipment')
        .select('*')
        .eq('location_id', locationId)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-6">{t('haccp.equipment.loading')}</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('haccp.equipment.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('haccp.equipment.subtitle')}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('haccp.equipment.addEquipment')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment?.map((item: any) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between">
              <Gauge className="h-8 w-8 text-primary" />
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                {t(`haccp.equipment.status.${item.status}`)}
              </span>
            </div>
            <h3 className="font-semibold mt-4">{item.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.equipment_type}</p>
            {item.code && (
              <p className="text-xs text-muted-foreground mt-1">{t('haccp.equipment.code')}: {item.code}</p>
            )}
            {(item.temperature_min !== null && item.temperature_max !== null) && (
              <div className="flex items-center gap-2 mt-4 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{t('haccp.equipment.range')}: {item.temperature_min}°C - {item.temperature_max}°C</span>
              </div>
            )}
            {item.next_maintenance_date && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>{t('haccp.equipment.maintenance')}: {new Date(item.next_maintenance_date).toLocaleDateString()}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {equipment?.length === 0 && (
        <Card className="p-12 text-center">
          <Gauge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('haccp.equipment.empty.title')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('haccp.equipment.empty.message')}
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('haccp.equipment.addEquipment')}
          </Button>
        </Card>
      )}
    </div>
  );
}
