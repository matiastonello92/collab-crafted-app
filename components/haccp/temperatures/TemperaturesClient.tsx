'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Thermometer, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface TemperaturesClientProps {
  locationId: string;
}

export function TemperaturesClient({ locationId }: TemperaturesClientProps) {
  const { t } = useTranslation();
  const { data: logs, isLoading } = useQuery({
    queryKey: ['haccp-temperature-logs', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_temperature_logs')
        .select(`
          *,
          equipment:haccp_equipment(name, equipment_type),
          recorder:profiles(full_name)
        `)
        .eq('location_id', locationId)
        .order('recorded_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-6">{t('haccp.temperatures.loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('haccp.temperatures.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('haccp.temperatures.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-4 font-medium">{t('haccp.temperatures.table.equipment')}</th>
                <th className="p-4 font-medium">{t('haccp.temperatures.table.temperature')}</th>
                <th className="p-4 font-medium">{t('haccp.temperatures.table.status')}</th>
                <th className="p-4 font-medium">{t('haccp.temperatures.table.recordedBy')}</th>
                <th className="p-4 font-medium">{t('haccp.temperatures.table.dateTime')}</th>
                <th className="p-4 font-medium">{t('haccp.temperatures.table.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{log.equipment?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.equipment?.equipment_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-semibold">
                      {log.temperature}{log.unit}
                    </span>
                  </td>
                  <td className="p-4">
                    {log.is_within_range ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {t('haccp.temperatures.status.inRange')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        {t('haccp.temperatures.status.outOfRange')}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm">{log.recorder?.full_name || t('haccp.temperatures.unknown')}</td>
                  <td className="p-4 text-sm">
                    {new Date(log.recorded_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {log.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {logs?.length === 0 && (
        <Card className="p-12 text-center">
          <Thermometer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('haccp.temperatures.empty.title')}</h3>
          <p className="text-muted-foreground">
            {t('haccp.temperatures.empty.message')}
          </p>
        </Card>
      )}
    </div>
  );
}
