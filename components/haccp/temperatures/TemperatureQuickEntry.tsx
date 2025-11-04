'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { EquipmentTempCard } from './EquipmentTempCard';
import { OutOfRangeAlert } from './OutOfRangeAlert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TemperatureQuickEntryProps {
  locationId: string;
  orgId: string;
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  temperature_min: number | null;
  temperature_max: number | null;
  code: string | null;
  status: string;
}

interface OutOfRangeData {
  equipmentName: string;
  temperature: number;
  range: { min: number; max: number };
  temperatureLogId: string;
}

export function TemperatureQuickEntry({ locationId, orgId }: TemperatureQuickEntryProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [outOfRangeAlert, setOutOfRangeAlert] = useState<OutOfRangeData | null>(null);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['haccp-equipment-active', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_equipment')
        .select('id, name, equipment_type, temperature_min, temperature_max, code, status')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data as Equipment[];
    },
  });

  const recordMutation = useMutation({
    mutationFn: async ({ equipmentId, temperature }: { equipmentId: string; temperature: number }) => {
      const equipmentItem = equipment?.find((e) => e.id === equipmentId);
      if (!equipmentItem) throw new Error('Equipment not found');

      const isWithinRange =
        equipmentItem.temperature_min !== null &&
        equipmentItem.temperature_max !== null &&
        temperature >= equipmentItem.temperature_min &&
        temperature <= equipmentItem.temperature_max;

      const { data, error } = await supabase
        .from('haccp_temperature_logs')
        .insert({
          org_id: orgId,
          location_id: locationId,
          equipment_id: equipmentId,
          temperature,
          unit: '°C',
          is_within_range: isWithinRange,
        })
        .select()
        .single();

      if (error) throw error;

      return { log: data, equipment: equipmentItem, isWithinRange };
    },
    onSuccess: ({ log, equipment: equipmentItem, isWithinRange }) => {
      toast.success(`Temperature recorded for ${equipmentItem.name}`);
      queryClient.invalidateQueries({ queryKey: ['haccp-temperature-logs'] });

      if (
        !isWithinRange &&
        equipmentItem.temperature_min !== null &&
        equipmentItem.temperature_max !== null
      ) {
        setOutOfRangeAlert({
          equipmentName: equipmentItem.name,
          temperature: parseFloat(log.temperature),
          range: {
            min: equipmentItem.temperature_min,
            max: equipmentItem.temperature_max,
          },
          temperatureLogId: log.id,
        });
      }
    },
    onError: (error) => {
      console.error('Error recording temperature:', error);
      toast.error('Failed to record temperature');
    },
  });

  const handleRecord = async (equipmentId: string, temperature: number) => {
    await recordMutation.mutateAsync({ equipmentId, temperature });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!equipment || equipment.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No active equipment found for this location.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add equipment in the Equipment section to start recording temperatures.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Quick Temperature Check</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Record temperatures for all equipment quickly
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/haccp/temperatures">
            <History className="w-4 h-4 mr-2" />
            View History
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item) => (
          <EquipmentTempCard
            key={item.id}
            equipment={item}
            onRecord={handleRecord}
            isRecording={recordMutation.isPending}
          />
        ))}
      </div>

      {outOfRangeAlert && (
        <OutOfRangeAlert
          open={!!outOfRangeAlert}
          onOpenChange={(open) => !open && setOutOfRangeAlert(null)}
          equipmentName={outOfRangeAlert.equipmentName}
          temperature={outOfRangeAlert.temperature}
          range={outOfRangeAlert.range}
          temperatureLogId={outOfRangeAlert.temperatureLogId}
          orgId={orgId}
          locationId={locationId}
        />
      )}
    </div>
  );
}
