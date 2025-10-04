'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Eye, FileText, Trash } from 'lucide-react';
import { CreateInventoryModal } from './CreateInventoryModal';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
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
import { useTranslation } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryList } from '@/app/(app)/inventory/hooks/useInventoryList';

interface InventoryListPageProps {
  category: 'kitchen' | 'bar' | 'cleaning';
}

type InventoryStatus = 'in_progress' | 'completed' | 'approved';

interface InventoryHeader {
  id: string;
  category: string;
  status: InventoryStatus;
  started_by: string;
  approved_by?: string;
  started_at: string;
  approved_at?: string;
  total_value: number;
  notes?: string;
  template_id?: string;
  creation_mode?: 'template' | 'last' | 'empty';
  profiles?: {
    full_name?: string;
  };
}

export function InventoryListPage({ category }: InventoryListPageProps) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inventoryToDelete, setInventoryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Pattern di RecipesClient: load user e location dal profile
  const [userId, setUserId] = useState<string | null>(null);
  const [defaultLocationId, setDefaultLocationId] = useState<string>('');

  const router = useRouter();
  
  // Load user and location on mount
  useEffect(() => {
    async function loadUser() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_location_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.default_location_id) {
          setDefaultLocationId(profile.default_location_id);
        }
      }
    }
    loadUser();
  }, []);
  
  const { isAdmin, permissions, isLoading: permissionsLoading } = usePermissions(defaultLocationId || undefined);
  
  // Use SWR hook for data fetching - aspetta che defaultLocationId sia disponibile
  const { inventories, isLoading, mutate } = useInventoryList(defaultLocationId || null, category);
  
  const canDelete = isAdmin || permissions.includes('*');

  const filteredInventories = useMemo(() => {
    if (statusFilter === 'all') return inventories;
    return inventories.filter(inv => inv.status === statusFilter);
  }, [inventories, statusFilter]);

  const handleViewInventory = (inventoryId: string) => {
    router.push(`/inventory/${category}/${inventoryId}`);
  };

  const handleInventoryCreated = (inventoryId: string) => {
    setShowCreateModal(false);
    router.push(`/inventory/${category}/${inventoryId}`);
  };

  const handleDeleteClick = (inventoryId: string) => {
    setInventoryToDelete(inventoryId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!inventoryToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/inventory/headers?id=${inventoryToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(t('inventory.toast.errorDeletingProduct'));
      }

      toast.success(t('inventory.toast.inventoryDeleted'));
      await mutate(); // Revalidate via SWR
    } catch (error) {
      console.error('Error deleting inventory:', error);
      toast.error(t('inventory.toast.errorDeletingProduct'));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setInventoryToDelete(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: it });
  };

  if (!defaultLocationId || permissionsLoading || isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t(`inventory.fullTitles.${category}`)}</h1>
          <p className="text-muted-foreground">{t('inventory.descriptions.manageInventories')}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          {t('inventory.buttons.createInventory')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('inventory.history')}</CardTitle>
              <CardDescription>{t('inventory.descriptions.manageInventories')}</CardDescription>
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">{t('inventory.filters.all')}</TabsTrigger>
                <TabsTrigger value="in_progress">{t('inventory.status.inProgress')}</TabsTrigger>
                <TabsTrigger value="completed">{t('inventory.status.completed')}</TabsTrigger>
                <TabsTrigger value="approved">{t('inventory.status.approved')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInventories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('inventory.empty.noInventories')}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('inventory.buttons.createInventory')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.labels.date')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('inventory.labels.createdBy')}</TableHead>
                  <TableHead className="text-right">{t('inventory.labels.totalValue')}</TableHead>
                  <TableHead>{t('inventory.labels.notes')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.map((inventory) => (
                  <TableRow key={inventory.id}>
                    <TableCell>{formatDate(inventory.started_at)}</TableCell>
                    <TableCell>
                      <Badge variant={inventory.status === 'approved' ? 'outline' : inventory.status === 'completed' ? 'secondary' : 'default'}>
                        {t(`inventory.status.${inventory.status === 'in_progress' ? 'inProgress' : inventory.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      Utente
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inventory.total_value)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {inventory.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInventory(inventory.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('inventory.buttons.view')}
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(inventory.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" />
                            {t('inventory.buttons.delete')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <CreateInventoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          category={category}
          locationId={defaultLocationId || ''}
          onSuccess={handleInventoryCreated}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory.confirmations.deleteInventory')}</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo inventario? Questa azione è irreversibile e verranno eliminati anche tutti i dati associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('inventory.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('inventory.loading.deleting')}
                </>
              ) : (
                t('inventory.buttons.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
