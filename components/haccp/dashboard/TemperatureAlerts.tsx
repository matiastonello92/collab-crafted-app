'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Thermometer } from 'lucide-react';
import { format } from 'date-fns';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface TemperatureAlert {
  id: string;
  temperature: number;
  unit: string;
  recorded_at: string;
  min_threshold?: number;
  max_threshold?: number;
  equipment: {
    name: string;
  };
}

interface TemperatureAlertsProps {
  alerts: TemperatureAlert[];
}

export function TemperatureAlerts({ alerts }: TemperatureAlertsProps) {
  const { isMobile } = useBreakpoint();

  if (alerts.length === 0) return null;

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Temperature Alerts</CardTitle>
        </div>
        <CardDescription>Recent out-of-range temperature readings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border border-destructive/20 bg-destructive/5 ${
                isMobile ? 'space-y-2' : 'flex items-center justify-between'
              }`}
            >
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{alert.equipment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(alert.recorded_at), 'MMM dd, HH:mm')}
                  </p>
                </div>
              </div>
              <div className={`flex ${isMobile ? 'justify-between' : 'gap-3'} items-center`}>
                <Badge variant="destructive" className="font-mono">
                  {alert.temperature}°{alert.unit === 'celsius' ? 'C' : 'F'}
                </Badge>
                {(alert.min_threshold || alert.max_threshold) && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Range: {alert.min_threshold}° - {alert.max_threshold}°
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
