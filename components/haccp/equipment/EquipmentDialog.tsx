'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  code?: string;
  temperature_min?: number;
  temperature_max?: number;
  status: string;
  maintenance_schedule?: string;
  next_maintenance?: string;
  notes?: string;
}

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  locationId: string;
  orgId: string;
  onSuccess?: () => void;
}

const EQUIPMENT_TYPES = [
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'display_case', label: 'Display Case' },
  { value: 'walk_in_cooler', label: 'Walk-in Cooler' },
  { value: 'blast_chiller', label: 'Blast Chiller' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
];

export function EquipmentDialog({ open, onOpenChange, equipment, locationId, orgId, onSuccess }: EquipmentDialogProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: 'refrigerator',
    code: '',
    temperature_min: '',
    temperature_max: '',
    status: 'active',
    maintenance_schedule: '',
    next_maintenance: '',
    notes: '',
  });

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name || '',
        equipment_type: equipment.equipment_type || 'refrigerator',
        code: equipment.code || '',
        temperature_min: equipment.temperature_min?.toString() || '',
        temperature_max: equipment.temperature_max?.toString() || '',
        status: equipment.status || 'active',
        maintenance_schedule: equipment.maintenance_schedule || '',
        next_maintenance: equipment.next_maintenance || '',
        notes: equipment.notes || '',
      });
    } else {
      setFormData({
        name: '',
        equipment_type: 'refrigerator',
        code: '',
        temperature_min: '',
        temperature_max: '',
        status: 'active',
        maintenance_schedule: '',
        next_maintenance: '',
        notes: '',
      });
    }
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('Equipment name is required');
        setLoading(false);
        return;
      }

      const tempMin = formData.temperature_min ? parseFloat(formData.temperature_min) : null;
      const tempMax = formData.temperature_max ? parseFloat(formData.temperature_max) : null;

      if (tempMin !== null && tempMax !== null && tempMin >= tempMax) {
        toast.error('Minimum temperature must be less than maximum temperature');
        setLoading(false);
        return;
      }

      const payload = {
        org_id: orgId,
        location_id: locationId,
        name: formData.name.trim(),
        equipment_type: formData.equipment_type,
        code: formData.code.trim() || null,
        temperature_min: tempMin,
        temperature_max: tempMax,
        status: formData.status,
        maintenance_schedule: formData.maintenance_schedule.trim() || null,
        next_maintenance: formData.next_maintenance || null,
        notes: formData.notes.trim() || null,
      };

      if (equipment) {
        // Update existing equipment
        const { error } = await supabase
          .from('haccp_equipment')
          .update(payload)
          .eq('id', equipment.id);

        if (error) throw error;
        toast.success('Equipment updated successfully');
      } else {
        // Insert new equipment
        const { error } = await supabase
          .from('haccp_equipment')
          .insert(payload);

        if (error) throw error;
        toast.success('Equipment created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      toast.error('Failed to save equipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
          <DialogDescription>
            {equipment ? 'Update equipment details and temperature ranges.' : 'Add new HACCP monitored equipment.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Kitchen Refrigerator"
              required
            />
          </div>

          {/* Type and Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment_type">Type *</Label>
              <Select value={formData.equipment_type} onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}>
                <SelectTrigger id="equipment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Equipment Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., REF-01"
              />
            </div>
          </div>

          {/* Temperature Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature_min">Min Temperature (°C)</Label>
              <Input
                id="temperature_min"
                type="number"
                step="0.1"
                value={formData.temperature_min}
                onChange={(e) => setFormData({ ...formData, temperature_min: e.target.value })}
                placeholder="e.g., 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature_max">Max Temperature (°C)</Label>
              <Input
                id="temperature_max"
                type="number"
                step="0.1"
                value={formData.temperature_max}
                onChange={(e) => setFormData({ ...formData, temperature_max: e.target.value })}
                placeholder="e.g., 8"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance_schedule">Maintenance Schedule</Label>
              <Input
                id="maintenance_schedule"
                value={formData.maintenance_schedule}
                onChange={(e) => setFormData({ ...formData, maintenance_schedule: e.target.value })}
                placeholder="e.g., Monthly"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_maintenance">Next Maintenance Date</Label>
              <Input
                id="next_maintenance"
                type="date"
                value={formData.next_maintenance}
                onChange={(e) => setFormData({ ...formData, next_maintenance: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this equipment..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {equipment ? 'Update Equipment' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
