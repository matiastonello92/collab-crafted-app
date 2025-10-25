'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Gauge, AlertCircle, Wrench } from 'lucide-react';

interface EquipmentClientProps {
  locationId: string;
}

export function EquipmentClient({ locationId }: EquipmentClientProps) {
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
    return <div className="p-6">Loading equipment...</div>;
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
          <h1 className="text-3xl font-bold">HACCP Equipment</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage HACCP critical equipment
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment?.map((item: any) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start justify-between">
              <Gauge className="h-8 w-8 text-primary" />
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
            </div>
            <h3 className="font-semibold mt-4">{item.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.equipment_type}</p>
            {item.code && (
              <p className="text-xs text-muted-foreground mt-1">Code: {item.code}</p>
            )}
            {(item.temperature_min !== null && item.temperature_max !== null) && (
              <div className="flex items-center gap-2 mt-4 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Range: {item.temperature_min}°C - {item.temperature_max}°C</span>
              </div>
            )}
            {item.next_maintenance_date && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>Maintenance: {new Date(item.next_maintenance_date).toLocaleDateString()}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {equipment?.length === 0 && (
        <Card className="p-12 text-center">
          <Gauge className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No equipment registered</h3>
          <p className="text-muted-foreground mb-4">
            Add your first equipment to start monitoring
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </Card>
      )}
    </div>
  );
}
