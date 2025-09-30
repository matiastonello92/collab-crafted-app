'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Eye, FileText } from 'lucide-react';
import { CreateInventoryModal } from './CreateInventoryModal';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store/unified';
import { usePermissions } from '@/hooks/usePermissions';

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

const categoryLabels = {
  kitchen: 'Cucina',
  bar: 'Bar',
  cleaning: 'Pulizie'
};

const statusLabels = {
  in_progress: 'In corso',
  completed: 'Completato',
  approved: 'Approvato'
};

const statusVariants = {
  in_progress: 'default',
  completed: 'secondary',
  approved: 'outline'
} as const;

export function InventoryListPage({ category }: InventoryListPageProps) {
  const [inventories, setInventories] = useState<InventoryHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | InventoryStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const supabase = useSupabase();
  const router = useRouter();
  
  // Use Zustand selectors for proper reactivity
  const locationId = useAppStore(state => state.context.location_id);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const { isAdmin, isLoading: permissionsLoading } = usePermissions(locationId || undefined);

  const loadInventories = useCallback(async () => {
    if (!locationId || locationId === 'null') {
      console.log('⚠️ [LIST] Invalid location, skipping load');
      return;
    }

    console.log('📥 [LIST] Loading inventories for location:', locationId, 'category:', category);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_headers')
        .select('*')
        .eq('location_id', locationId)
        .eq('category', category)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('❌ [LIST] Error loading inventories:', error);
        toast.error('Errore nel caricamento degli inventari');
        return;
      }

      console.log('✅ [LIST] Loaded inventories:', data?.length || 0);
      setInventories(data || []);
    } catch (error) {
      console.error('❌ [LIST] Error in loadInventories:', error);
      toast.error('Errore nel caricamento degli inventari');
    } finally {
      setLoading(false);
    }
  }, [locationId, category, supabase]);

  // Client-side filtering for better performance
  const filteredInventories = useMemo(() => {
    if (statusFilter === 'all') return inventories;
    return inventories.filter(inv => inv.status === statusFilter);
  }, [inventories, statusFilter]);

  useEffect(() => {
    if (!hasHydrated) {
      console.log('⏳ [LIST] Waiting for store hydration...');
      return;
    }

    if (!locationId) {
      console.log('⚠️ [LIST] Missing location context');
      setLoading(false);
      return;
    }

    console.log('✅ [LIST] Loading data for location:', locationId);
    loadInventories();
  }, [hasHydrated, locationId, loadInventories]);

  const handleViewInventory = (inventoryId: string) => {
    router.push(`/inventory/${category}/${inventoryId}`);
  };

  const handleInventoryCreated = (inventoryId: string) => {
    setShowCreateModal(false);
    router.push(`/inventory/${category}/${inventoryId}`);
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

  if (loading || permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventario {categoryLabels[category]}</h1>
          <p className="text-muted-foreground">Gestisci gli inventari per questa categoria</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nuovo Inventario
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lista Inventari</CardTitle>
              <CardDescription>Tutti gli inventari per {categoryLabels[category]}</CardDescription>
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Tutti</TabsTrigger>
                <TabsTrigger value="in_progress">In corso</TabsTrigger>
                <TabsTrigger value="completed">Completati</TabsTrigger>
                <TabsTrigger value="approved">Approvati</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredInventories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun inventario trovato</p>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crea il primo inventario
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Inizio</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creato da</TableHead>
                  <TableHead className="text-right">Valore Totale</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.map((inventory) => (
                  <TableRow key={inventory.id}>
                    <TableCell>{formatDate(inventory.started_at)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[inventory.status]}>
                        {statusLabels[inventory.status]}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInventory(inventory.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizza
                      </Button>
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
          locationId={locationId || ''}
          onSuccess={handleInventoryCreated}
        />
      )}
    </div>
  );
}
