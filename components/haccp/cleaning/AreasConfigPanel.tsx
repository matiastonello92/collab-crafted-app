'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AreasConfigPanelProps {
  locationId: string;
  orgId: string;
}

interface CleaningArea {
  id: string;
  name: string;
  description: string | null;
  zone_code: string | null;
  cleaning_frequency: string;
  checklist_items: Array<{ id: string; text: string }>;
  is_active: boolean;
}

interface AreaFormData {
  name: string;
  description: string;
  zone_code: string;
  cleaning_frequency: string;
  checklist_items: string[];
  deadline_type: 'end_of_period' | 'custom_time';
  deadline_time: string;
  deadline_offset_hours: number;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function AreasConfigPanel({ locationId, orgId }: AreasConfigPanelProps) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<CleaningArea | null>(null);
  const [formData, setFormData] = useState<AreaFormData>({
    name: '',
    description: '',
    zone_code: '',
    cleaning_frequency: 'daily',
    checklist_items: [''],
    deadline_type: 'end_of_period',
    deadline_time: '23:59',
    deadline_offset_hours: 0,
  });

  const { data: areas, isLoading } = useQuery({
    queryKey: ['cleaning-areas', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_cleaning_areas')
        .select('*')
        .eq('location_id', locationId)
        .order('name');

      if (error) throw error;
      return data as CleaningArea[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AreaFormData) => {
      const payload = {
        org_id: orgId,
        location_id: locationId,
        name: data.name,
        description: data.description || null,
        zone_code: data.zone_code || null,
        cleaning_frequency: data.cleaning_frequency,
        checklist_items: data.checklist_items
          .filter((item) => item.trim())
          .map((text, index) => ({ id: `item-${index}`, text })),
        deadline_type: data.deadline_type,
        deadline_time: data.deadline_time,
        deadline_offset_hours: 0, // Always set to 0 - simplified UX
      };

      if (editingArea) {
        const { error } = await supabase
          .from('haccp_cleaning_areas')
          .update(payload)
          .eq('id', editingArea.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('haccp_cleaning_areas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingArea ? 'Area updated successfully' : 'Area created successfully');
      queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error saving area:', error);
      toast.error('Failed to save area');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (areaId: string) => {
      const { error } = await supabase
        .from('haccp_cleaning_areas')
        .update({ is_active: false })
        .eq('id', areaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Area deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
    },
    onError: (error) => {
      console.error('Error deleting area:', error);
      toast.error('Failed to delete area');
    },
  });

  const handleOpenDialog = (area?: CleaningArea) => {
    if (area) {
      setEditingArea(area);
      setFormData({
        name: area.name,
        description: area.description || '',
        zone_code: area.zone_code || '',
        cleaning_frequency: area.cleaning_frequency,
        checklist_items: area.checklist_items.map((item) => item.text),
        deadline_type: (area as any).deadline_type || 'end_of_period',
        deadline_time: (area as any).deadline_time || '23:59',
        deadline_offset_hours: (area as any).deadline_offset_hours || 0,
      });
    } else {
      setEditingArea(null);
      setFormData({
        name: '',
        description: '',
        zone_code: '',
        cleaning_frequency: 'daily',
        checklist_items: [''],
        deadline_type: 'end_of_period',
        deadline_time: '23:59',
        deadline_offset_hours: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingArea(null);
    setFormData({
      name: '',
      description: '',
      zone_code: '',
      cleaning_frequency: 'daily',
      checklist_items: [''],
      deadline_type: 'end_of_period',
      deadline_time: '23:59',
      deadline_offset_hours: 0,
    });
  };

  const handleAddChecklistItem = () => {
    setFormData((prev) => ({
      ...prev,
      checklist_items: [...prev.checklist_items, ''],
    }));
  };

  const handleRemoveChecklistItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      checklist_items: prev.checklist_items.filter((_, i) => i !== index),
    }));
  };

  const handleChecklistItemChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist_items: prev.checklist_items.map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Area name is required');
      return;
    }
    if (formData.checklist_items.filter((item) => item.trim()).length === 0) {
      toast.error('At least one checklist item is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cleaning Areas Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure cleaning areas and their schedules
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Area
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArea ? 'Edit' : 'Add'} Cleaning Area</DialogTitle>
              <DialogDescription>
                Configure the area details and checklist items.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Area Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kitchen Main Area"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone_code">Zone Code</Label>
                  <Input
                    id="zone_code"
                    value={formData.zone_code}
                    onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })}
                    placeholder="e.g., Z1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.cleaning_frequency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cleaning_frequency: value })
                    }
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold">Deadline Configuration</Label>
                <div className="space-y-2">
                  <Label htmlFor="deadline_type" className="text-xs">Deadline Type</Label>
                  <Select
                    value={formData.deadline_type}
                    onValueChange={(value: 'end_of_period' | 'custom_time') =>
                      setFormData({ ...formData, deadline_type: value })
                    }
                  >
                    <SelectTrigger id="deadline_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_of_period">End of Period (Default)</SelectItem>
                      <SelectItem value="custom_time">Custom Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.deadline_type === 'end_of_period' 
                      ? 'Task expires at end of day/week/month based on frequency'
                      : 'Set a custom deadline time for the task'}
                  </p>
                </div>

                {formData.deadline_type === 'custom_time' && (
                  <div className="space-y-2">
                    <Label htmlFor="deadline_time" className="text-xs">
                      Scadenza Entro Le *
                    </Label>
                    <Input
                      id="deadline_time"
                      type="time"
                      value={formData.deadline_time}
                      onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                      className="w-full"
                    />
                    <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">ℹ️</span>
                        <span>
                          La task deve essere completata entro l'orario indicato. 
                          Se l'orario è già passato, la deadline sarà per il giorno successivo.
                        </span>
                      </p>
                      {formData.deadline_time && (
                        <p className="mt-2 font-medium text-foreground">
                          Esempio: Scadenza ore {formData.deadline_time}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Checklist Items *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddChecklistItem}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.checklist_items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handleChecklistItemChange(index, e.target.value)}
                        placeholder={`Checklist item ${index + 1}`}
                      />
                      {formData.checklist_items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveChecklistItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Area'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!areas || areas.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No cleaning areas configured yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Click "Add Area" to create your first cleaning area.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {areas
            .filter((area) => area.is_active)
            .map((area) => (
              <Card key={area.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{area.name}</h3>
                      {area.description && (
                        <p className="text-sm text-muted-foreground mt-1">{area.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    {area.zone_code && <Badge variant="outline">{area.zone_code}</Badge>}
                    <Badge variant="secondary">{area.cleaning_frequency}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {area.checklist_items.length} checklist items
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(area)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(area.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
