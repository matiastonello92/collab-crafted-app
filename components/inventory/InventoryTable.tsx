'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { AddItemDialog } from './AddItemDialog';

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
  orgId: string;
  locationId: string;
  category: string;
}

export function InventoryTable({ headerId, canManage, canEdit, orgId, locationId, category }: InventoryTableProps) {
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadLines();
  }, [headerId]);

  const loadLines = async () => {
    try {
      const response = await fetch(`/api/v1/inventory/lines?header_id=${headerId}`);
      if (response.ok) {
        const data = await response.json();
        setLines(data.lines || []);
      }
    } catch (error) {
      console.error('Error loading lines:', error);
    } finally {
      setLoading(false);
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
            } else {
              toast.error("Errore durante il salvataggio");
            }
          } catch (error) {
            console.error('Error updating quantity:', error);
            toast.error("Errore durante il salvataggio");
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
    []
  );

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi Prodotto
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Articolo</TableHead>
              <TableHead>Sezione</TableHead>
              <TableHead>U.M.</TableHead>
              <TableHead>Quantità</TableHead>
              <TableHead>Prezzo Unitario</TableHead>
              <TableHead>Valore</TableHead>
              {canManage && <TableHead>Azioni</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.name_snapshot}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    Generico
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
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
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
        orgId={orgId}
        locationId={locationId}
        category={category}
      />
    </div>
  );
}