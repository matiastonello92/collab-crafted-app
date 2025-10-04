'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Download, Mail, Eye, Edit, Filter, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSupabase } from '@/hooks/useSupabase';
import { useAppStore } from '@/lib/store/unified';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface InventoryHistoryItem {
  id: string;
  category: string;
  status: string;
  started_at: string;
  approved_at: string | null;
  total_value: number;
  started_by_name?: string;
  approved_by_name?: string;
  location_name?: string;
}

export function InventoryHistoryPage() {
  const { t } = useTranslation()
  const [inventories, setInventories] = useState<InventoryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Step 1: Use global store instead of local state
  const locationId = useAppStore(state => state.context.location_id);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  
  const supabase = useSupabase();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions(locationId || undefined);

  const loadInventories = useCallback(async () => {
    if (!locationId || locationId === 'null') {
      console.log('⚠️ [HISTORY] Invalid location, skipping load');
      return;
    }
    
    console.log('📥 [HISTORY] Loading inventories for location:', locationId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_headers')
        .select('*')
        .eq('location_id', locationId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        category: item.category,
        status: item.status,
        started_at: item.started_at,
        approved_at: item.approved_at,
        total_value: item.total_value || 0,
        started_by_name: 'N/A',
        approved_by_name: 'N/A',
        location_name: 'N/A'
      })) || [];

      console.log('✅ [HISTORY] Loaded inventories:', formattedData.length);
      setInventories(formattedData);
    } catch (error) {
      console.error('❌ [HISTORY] Error loading inventories:', error);
      toast.error(t('inventory.historyPage.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [locationId, supabase, t]);

  useEffect(() => {
    if (!hasHydrated) {
      console.log('⏳ [HISTORY] Waiting for hydration...');
      return;
    }
    
    if (!locationId) {
      console.log('⚠️ [HISTORY] Missing location context');
      setLoading(false);
      return;
    }
    
    console.log('📍 [HISTORY] Loading data for location:', locationId);
    loadInventories();
  }, [hasHydrated, locationId, loadInventories]);

  const filteredInventories = inventories.filter(item => {
    const matchesSearch = !searchTerm || 
      item.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.started_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.approved_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const exportToPDF = (inventoryId: string) => {
    // TODO: Implement PDF export
    toast.info('Export PDF - Coming soon');
  };

  const sendEmail = (inventoryId: string) => {
    // TODO: Implement email functionality  
    toast.info('Invio email - Coming soon');
  };

  const viewDetails = (inventoryId: string) => {
    // TODO: Navigate to detail view
    toast.info('Vista dettaglio - Coming soon');
  };

  const editInventory = (inventoryId: string) => {
    // TODO: Navigate to edit view (only for managers/admins on approved inventories)
    toast.info('Modifica inventario - Coming soon');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-blue-100 text-blue-800',
      'approved': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const canEdit = (status: string) => {
    if (isAdmin) return true;
    if (status === 'in_progress' || status === 'completed') return true;
    return false;
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('inventory.historyPage.title')}
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder={t('inventory.historyPage.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('inventory.historyPage.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.historyPage.allStatuses')}</SelectItem>
                <SelectItem value="in_progress">{t('inventory.status.in_progress')}</SelectItem>
                <SelectItem value="completed">{t('inventory.status.completed')}</SelectItem>
                <SelectItem value="approved">{t('inventory.status.approved')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('inventory.historyPage.filterCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.historyPage.allCategories')}</SelectItem>
                <SelectItem value="kitchen">{t('inventory.categories.kitchen')}</SelectItem>
                <SelectItem value="bar">{t('inventory.categories.bar')}</SelectItem>
                <SelectItem value="cleaning">{t('inventory.categories.cleaning')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading || permissionsLoading ? (
            <div className="text-center py-8">{t('inventory.loading.history')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.historyPage.tableHeaders.startDate')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.category')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.location')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.status')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.totalValue')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.startedBy')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.approvedBy')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.approvalDate')}</TableHead>
                  <TableHead>{t('inventory.historyPage.tableHeaders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.started_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell>{t(`inventory.categories.${item.category}`)}</TableCell>
                    <TableCell>{item.location_name}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {t(`inventory.status.${item.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>€{item.total_value.toFixed(2)}</TableCell>
                    <TableCell>{item.started_by_name}</TableCell>
                    <TableCell>{item.approved_by_name}</TableCell>
                    <TableCell>
                      {item.approved_at 
                        ? format(new Date(item.approved_at), 'dd/MM/yyyy HH:mm', { locale: it })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(item.id)}
                          title="Visualizza dettagli"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportToPDF(item.id)}
                          title="Export PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => sendEmail(item.id)}
                          title="Invia per email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        
                        {canEdit(item.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editInventory(item.id)}
                            title="Modifica"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredInventories.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nessun inventario trovato
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}