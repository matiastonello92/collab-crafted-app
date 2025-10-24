'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditProductDialog } from './EditProductDialog';
import { NewProductForm } from './NewProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store/unified';
import { usePermissions, hasPermission } from '@/hooks/usePermissions';
import { useTranslation } from '@/lib/i18n';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { hapticLight, setupKeyboard } from '@/lib/capacitor/native';

interface CatalogPageProps {
  category: 'kitchen' | 'bar' | 'cleaning';
}

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
  product_category?: string;
  is_active: boolean;
  created_at: string;
}

export function CatalogPage({ category }: CatalogPageProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [editingProduct, setEditingProduct] = useState<CatalogItem | null>(null);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Use global store and permissions hook
  const locationId = useAppStore(state => state.context.location_id);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const { isAdmin, permissions } = usePermissions(locationId || undefined);

  // Setup keyboard for mobile
  useEffect(() => {
    setupKeyboard();
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!locationId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/inventory/catalog?location_id=${locationId}&category=${category}${showActiveOnly ? '&is_active=true' : ''}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setItems((data.items || []).sort((a: CatalogItem, b: CatalogItem) => 
          a.name.localeCompare(b.name)
        ));
      } else {
        toast.error(t('inventory.toast.errorLoadingCatalog'));
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
      toast.error(t('inventory.toast.errorLoadingCatalog'));
    } finally {
      setLoading(false);
    }
  }, [locationId, category, showActiveOnly]);

  useEffect(() => {
    if (!hasHydrated || !locationId) return;
    loadCatalog();
  }, [hasHydrated, loadCatalog]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('inventory.confirmations.deleteProduct'))) {
      return;
    }

    // Ottimistic update: rimuovi subito dalla UI
    setItems(prevItems => prevItems.filter(item => item.id !== productId));

    try {
      const response = await fetch(`/api/v1/inventory/catalog?id=${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('inventory.toast.productDeleted'));
      } else {
        // Rollback in caso di errore
        loadCatalog();
        const error = await response.json();
        toast.error(error.error || t('inventory.toast.errorDeletingProduct'));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      // Rollback in caso di errore
      loadCatalog();
      toast.error(t('inventory.toast.errorDeletingProduct'));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t('inventory.confirmations.bulkDeleteProducts').replace('{count}', selectedIds.size.toString()))) return;

    const idsToDelete = Array.from(selectedIds);
    
    // Aggiornamento ottimistico
    setItems(prevItems => prevItems.filter(item => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
    setIsDeleting(true);

    try {
      const results = await Promise.allSettled(
        idsToDelete.map(id => 
          fetch(`/api/v1/inventory/catalog?id=${id}`, { method: 'DELETE' })
        )
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} ${t('inventory.labels.products')} ${t('inventory.toast.errorDeletingProduct')}`);
        loadCatalog(); // Rollback
      } else {
        toast.success(`${idsToDelete.length} ${t('inventory.toast.productDeleted')}`);
      }
    } catch (error) {
      toast.error(t('inventory.toast.errorDeletingProduct'));
      loadCatalog(); // Rollback
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || 
      item.product_category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Admin or users with inventory:edit permission can manage products
  const canManage = isAdmin || hasPermission(permissions, ['inventory:edit', 'inventory:create']);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('inventory.catalog')} - {t(`inventory.categories.${category}`)}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.templates.description')}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button 
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('inventory.buttons.bulkDelete')} ({selectedIds.size})
              </Button>
            )}
            <Button onClick={() => setShowNewProductDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('inventory.buttons.newProduct')}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('planner.common.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('inventory.placeholders.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('inventory.labels.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('inventory.filters.all')}</SelectItem>
                <SelectItem value="Carne">Carne</SelectItem>
                <SelectItem value="Pesce">Pesce</SelectItem>
                <SelectItem value="Vegetali">Vegetali</SelectItem>
                <SelectItem value="Latticini">Latticini</SelectItem>
                <SelectItem value="Conserve">Conserve</SelectItem>
                <SelectItem value="Surgelati">Surgelati</SelectItem>
                <SelectItem value="Vini">Vini</SelectItem>
                <SelectItem value="Birre">Birre</SelectItem>
                <SelectItem value="Soft Drink">Soft Drink</SelectItem>
                <SelectItem value="Consumabili">Consumabili</SelectItem>
                <SelectItem value="Altro">Altro</SelectItem>
                <SelectItem value="Pulizia">Pulizia</SelectItem>
                <SelectItem value="Manutenzione">Manutenzione</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showActiveOnly ? 'default' : 'outline'}
              onClick={() => setShowActiveOnly(!showActiveOnly)}
            >
              {showActiveOnly ? t('inventory.filters.activeOnly') : t('inventory.filters.all')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">{t('inventory.loading.catalog')}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('inventory.empty.noProductsFound')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(filteredItems.map(i => i.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>{t('inventory.labels.name')}</TableHead>
                  <TableHead>{t('inventory.labels.category')}</TableHead>
                  <TableHead>{t('inventory.labels.uom')}</TableHead>
                  <TableHead>{t('inventory.labels.unitPrice')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  {canManage && <TableHead>{t('common.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    {canManage && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedIds);
                            if (checked) {
                              newSelected.add(item.id);
                            } else {
                              newSelected.delete(item.id);
                            }
                            setSelectedIds(newSelected);
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.product_category && (
                        <Badge variant="outline">{item.product_category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.uom}</TableCell>
                    <TableCell>€{Number(item.default_unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? t('inventory.status.active') : t('inventory.status.inactive')}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingProduct(item)}
                            disabled={isDeleting}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(item.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          category={category}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            loadCatalog();
          }}
        />
      )}

      <Dialog open={showNewProductDialog} onOpenChange={setShowNewProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory.buttons.newProduct')} - {t(`inventory.categories.${category}`)}</DialogTitle>
          </DialogHeader>
          <NewProductForm
            locationId={locationId || ''}
            category={category}
            onProductCreated={() => {
              setShowNewProductDialog(false);
              loadCatalog();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
