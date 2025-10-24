'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AddItemDialog } from './AddItemDialog';
import { useTranslation } from '@/lib/i18n';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { hapticLight, setupKeyboard } from '@/lib/capacitor/native';

interface InventoryLine {
  id: string;
  name_snapshot: string;
  uom_snapshot: string;
  qty: number;
  unit_price_snapshot: number;
  line_value: number;
}

interface InventoryTableProps {
  headerId: string;
  canManage: boolean;
  canEdit: boolean;
  locationId: string;
  category: string;
  onHeaderUpdate?: () => void;
}

export function InventoryTable({ headerId, canManage, canEdit, locationId, category, onHeaderUpdate }: InventoryTableProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Setup keyboard for mobile
  useEffect(() => {
    setupKeyboard();
  }, []);

  const loadLines = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/inventory/lines?header_id=${headerId}`);
      if (response.ok) {
        const data = await response.json();
        setLines(data.lines || []);
      }
    } catch (error) {
      console.error(t('inventory.toast.errorLoadingProducts'), error);
    } finally {
      setLoading(false);
    }
  }, [headerId, t]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const handleDeleteLine = async (lineId: string) => {
    if (!confirm(t('inventory.confirmations.deleteItem'))) return;
    
    try {
      const response = await fetch(`/api/v1/inventory/lines?id=${lineId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('inventory.toast.productDeleted'));
        loadLines();
        if (onHeaderUpdate) {
          onHeaderUpdate();
        }
      } else {
        toast.error(t('inventory.toast.errorDeletingProduct'));
      }
    } catch (error) {
      console.error(t('inventory.toast.errorDeletingProduct'), error);
      toast.error(t('inventory.toast.errorDeletingProduct'));
    }
  };

  const debouncedUpdateQuantity = useCallback(
    (() => {
      const timeouts = new Map<string, NodeJS.Timeout>();
      
      return (lineId: string, qty: number) => {
        // Clear existing timeout for this line
        if (timeouts.has(lineId)) {
          clearTimeout(timeouts.get(lineId)!);
        }
        
        // Set saving state
        setSavingItems(prev => new Set([...prev, lineId]));
        
        // Update local state immediately for responsive UI
        setLines(prev => prev.map(line => 
          line.id === lineId ? { ...line, qty, line_value: qty * line.unit_price_snapshot } : line
        ));
        
        // Create new timeout for API call
        const timeout = setTimeout(async () => {
          try {
            const response = await fetch(`/api/v1/inventory/lines?id=${lineId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ qty }),
            });

            if (response.ok) {
              const data = await response.json();
              setLines(prev => prev.map(line => 
                line.id === lineId ? data.line : line
              ));
              // Reload header to update total value
              if (onHeaderUpdate) {
                onHeaderUpdate();
              }
            } else {
              toast.error(t('inventory.toast.errorUpdatingQuantity'));
            }
          } catch (error) {
            console.error(t('inventory.toast.errorUpdatingQuantity'), error);
            toast.error(t('inventory.toast.errorUpdatingQuantity'));
          } finally {
            setSavingItems(prev => {
              const newSet = new Set(prev);
              newSet.delete(lineId);
              return newSet;
            });
          }
          timeouts.delete(lineId);
        }, 1000); // 1 second debounce
        
        timeouts.set(lineId, timeout);
      };
    })(),
    [onHeaderUpdate, t]
  );

  if (loading) {
    return <div className="text-center py-8">{t('inventory.loading.products')}</div>;
  }

  // Mobile: Card-based layout
  if (isMobile) {
    return (
      <div className="space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {canManage && (
          <Button 
            onClick={() => setShowAddDialog(true)} 
            className="w-full min-h-[48px] gap-2"
          >
            <Plus className="h-5 w-5" />
            {t('inventory.buttons.addProduct')}
          </Button>
        )}
        
        {lines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('inventory.empty.noProducts')}
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line) => (
              <Card key={line.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {line.name_snapshot}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {line.uom_snapshot}
                      </p>
                    </div>
                    {canManage && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          await hapticLight();
                          handleDeleteLine(line.id);
                        }}
                        className="shrink-0 min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('inventory.labels.quantity')}
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          value={line.qty}
                          onChange={(e) => debouncedUpdateQuantity(line.id, parseFloat(e.target.value) || 0)}
                          disabled={!canEdit}
                          className="min-h-[44px] pr-10 text-base"
                        />
                        {savingItems.has(line.id) && (
                          <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('inventory.labels.unitPrice')}
                      </Label>
                      <div className="text-lg font-semibold mt-1">
                        €{Number(line.unit_price_snapshot).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('inventory.labels.totalValue')}
                      </span>
                      <span className="text-xl font-bold">
                        €{Number(line.line_value).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddItemDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={loadLines}
          headerId={headerId}
          locationId={locationId}
          category={category}
        />
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('inventory.buttons.addProduct')}
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.labels.product')}</TableHead>
              <TableHead>{t('inventory.labels.section')}</TableHead>
              <TableHead>{t('inventory.labels.uom')}</TableHead>
              <TableHead>{t('inventory.labels.quantity')}</TableHead>
              <TableHead>{t('inventory.labels.unitPrice')}</TableHead>
              <TableHead>{t('inventory.labels.totalValue')}</TableHead>
              {canManage && <TableHead>{t('common.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.name_snapshot}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {t('inventory.labels.none')}
                  </Badge>
                </TableCell>
                <TableCell>{line.uom_snapshot}</TableCell>
                <TableCell>
                  <div className="relative">
                    <Input
                      type="number"
                      value={line.qty}
                      onChange={(e) => debouncedUpdateQuantity(line.id, parseFloat(e.target.value) || 0)}
                      disabled={!canEdit}
                      className="w-20 pr-8"
                    />
                    {savingItems.has(line.id) && (
                      <Clock className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground animate-spin" />
                    )}
                  </div>
                </TableCell>
                <TableCell>€{Number(line.unit_price_snapshot).toFixed(2)}</TableCell>
                <TableCell>€{Number(line.line_value).toFixed(2)}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteLine(line.id)}
                      title={t('inventory.buttons.delete')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddItemDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={loadLines}
        headerId={headerId}
        locationId={locationId}
        category={category}
      />
    </div>
  );
}
