'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TodayTemperatureWidgetProps {
  locationId: string;
}

export function TodayTemperatureWidget({ locationId }: TodayTemperatureWidgetProps) {
  const supabase = useSupabase();

  const { data, isLoading } = useQuery({
    queryKey: ['temperature-status-today', locationId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('haccp_temperature_logs')
        .select(`
          *,
          equipment:haccp_equipment(name, temperature_min, temperature_max)
        `)
        .eq('location_id', locationId)
        .gte('recorded_at', today.toISOString());

      if (error) throw error;

      const inRange = logs?.filter(log => {
        const eq = log.equipment as any;
        if (!eq?.temperature_min || !eq?.temperature_max) return false;
        return log.temperature_value >= eq.temperature_min && log.temperature_value <= eq.temperature_max;
      }).length || 0;

      const outOfRange = (logs?.length || 0) - inRange;

      return {
        total: logs?.length || 0,
        inRange,
        outOfRange,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Temperature Status Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const { total = 0, inRange = 0, outOfRange = 0 } = data || {};

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Temperature Status Today</CardTitle>
          <Thermometer className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Checks</span>
          <span className="text-2xl font-bold">{total}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm">In Range</span>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            {inRange}
          </Badge>
        </div>
        {outOfRange > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Out of Range</span>
            </div>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {outOfRange}
            </Badge>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full mt-2">
          <Link href="/haccp/temperature-check">Quick Check</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
