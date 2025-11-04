'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Thermometer, AlertTriangle, CheckCircle } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  temperature_min: number | null;
  temperature_max: number | null;
  code: string | null;
}

interface EquipmentTempCardProps {
  equipment: Equipment;
  onRecord: (equipmentId: string, temperature: number) => Promise<void>;
  isRecording?: boolean;
}

export function EquipmentTempCard({ equipment, onRecord, isRecording }: EquipmentTempCardProps) {
  const [temperature, setTemperature] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'in-range' | 'out-range'>('idle');

  const validateTemperature = (value: string) => {
    const temp = parseFloat(value);
    if (isNaN(temp)) {
      setStatus('idle');
      return;
    }

    if (equipment.temperature_min !== null && equipment.temperature_max !== null) {
      if (temp >= equipment.temperature_min && temp <= equipment.temperature_max) {
        setStatus('in-range');
      } else {
        setStatus('out-range');
      }
    } else {
      setStatus('idle');
    }
  };

  const handleInputChange = (value: string) => {
    setTemperature(value);
    validateTemperature(value);
  };

  const handleRecord = async () => {
    const temp = parseFloat(temperature);
    if (isNaN(temp)) return;

    await onRecord(equipment.id, temp);
    setTemperature('');
    setStatus('idle');
  };

  const getStatusBadge = () => {
    if (status === 'in-range') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          In Range
        </Badge>
      );
    }
    if (status === 'out-range') {
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Out of Range
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Thermometer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{equipment.name}</h3>
            <p className="text-sm text-muted-foreground">{equipment.equipment_type}</p>
            {equipment.code && (
              <p className="text-xs text-muted-foreground mt-1">Code: {equipment.code}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {equipment.temperature_min !== null && equipment.temperature_max !== null && (
        <div className="mb-3 p-2 rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Range: {equipment.temperature_min}°C - {equipment.temperature_max}°C
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="number"
            step="0.1"
            placeholder="Temperature (°C)"
            value={temperature}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={isRecording}
            className="text-center font-mono"
          />
        </div>
        <Button
          onClick={handleRecord}
          disabled={!temperature || isNaN(parseFloat(temperature)) || isRecording}
          size="default"
          className="min-w-[100px]"
        >
          {isRecording ? 'Recording...' : 'Record'}
        </Button>
      </div>
    </Card>
  );
}
