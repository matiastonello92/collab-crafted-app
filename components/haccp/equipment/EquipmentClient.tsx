'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/hooks/useSupabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Gauge, AlertCircle, Wrench, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { EquipmentDialog } from './EquipmentDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EquipmentClientProps {
  locationId: string;
}

export function EquipmentClient({ locationId }: EquipmentClientProps) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null);

  // Get org_id from location
  const { data: locationData } = useQuery({
    queryKey: ['location', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('org_id')
        .eq('id', locationId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: equipment, isLoading, refetch } = useQuery({
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

  const handleEdit = (equipment: any) => {
    setSelectedEquipment(equipment);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEquipment(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (equipment: any) => {
    setEquipmentToDelete(equipment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return;

    try {
      const { error } = await supabase
        .from('haccp_equipment')
        .delete()
        .eq('id', equipmentToDelete.id);

      if (error) throw error;

      toast.success('Equipment deleted successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    } finally {
      setDeleteDialogOpen(false);
      setEquipmentToDelete(null);
    }
  };

  const handleSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return <div className="p-6">{t('haccp.equipment.loading')}</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inactive': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('haccp.equipment.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('haccp.equipment.subtitle')}
            </p>
          </div>
          <Button onClick={handleAdd} className="min-h-[44px]">
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
              {item.next_maintenance && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  <span>{t('haccp.equipment.maintenance')}: {new Date(item.next_maintenance).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="flex-1 min-h-[40px]">
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDeleteClick(item)} className="text-destructive hover:text-destructive min-h-[40px]">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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
            <Button onClick={handleAdd} className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" />
              {t('haccp.equipment.addEquipment')}
            </Button>
          </Card>
        )}
      </div>

      <EquipmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipment={selectedEquipment}
        locationId={locationId}
        orgId={locationData?.org_id || ''}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{equipmentToDelete?.name}"? This will also delete all associated temperature logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
