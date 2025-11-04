'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';

interface OutOfRangeAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentName: string;
  temperature: number;
  range: { min: number; max: number };
  temperatureLogId: string;
  orgId: string;
  locationId: string;
}

export function OutOfRangeAlert({
  open,
  onOpenChange,
  equipmentName,
  temperature,
  range,
  temperatureLogId,
  orgId,
  locationId,
}: OutOfRangeAlertProps) {
  const [actionTaken, setActionTaken] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const supabase = useSupabase();

  const handleCreateCorrectiveAction = async () => {
    if (!actionTaken.trim()) {
      toast.error('Please describe the action taken');
      return;
    }

    setIsCreating(true);
    try {
      const issueDescription = `Temperature out of range for ${equipmentName}: ${temperature}°C (Range: ${range.min}°C - ${range.max}°C)`;

      const { error } = await supabase
        .from('haccp_corrective_actions')
        .insert({
          org_id: orgId,
          location_id: locationId,
          temperature_log_id: temperatureLogId,
          issue_description: issueDescription,
          action_taken: actionTaken,
          severity: 'high',
          status: 'open',
        });

      if (error) throw error;

      toast.success('Corrective action created successfully');
      onOpenChange(false);
      setActionTaken('');
    } catch (error) {
      console.error('Error creating corrective action:', error);
      toast.error('Failed to create corrective action');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle>Temperature Out of Range</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            The recorded temperature is outside the acceptable range. A corrective action is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Equipment:</span>
                <span className="text-sm font-semibold">{equipmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recorded:</span>
                <span className="text-sm font-semibold text-destructive">{temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expected Range:</span>
                <span className="text-sm font-semibold">
                  {range.min}°C - {range.max}°C
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">Action Taken *</Label>
            <Textarea
              id="action"
              placeholder="Describe the corrective action taken (e.g., adjusted thermostat, moved products, contacted technician...)"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setActionTaken('');
            }}
            disabled={isCreating}
          >
            Skip
          </Button>
          <Button onClick={handleCreateCorrectiveAction} disabled={isCreating || !actionTaken.trim()}>
            {isCreating ? 'Creating...' : 'Create Corrective Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
