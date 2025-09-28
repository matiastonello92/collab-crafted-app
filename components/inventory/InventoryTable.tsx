'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function InventoryTable({ headerId, canManage, canEdit }: InventoryTableProps) {
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);

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

  const updateQuantity = async (lineId: string, qty: number) => {
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
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error("Errore durante l'aggiornamento");
    }
  };

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Articolo</TableHead>
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
              <TableCell>{line.uom_snapshot}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={line.qty}
                  onChange={(e) => updateQuantity(line.id, parseFloat(e.target.value) || 0)}
                  disabled={!canEdit}
                  className="w-20"
                />
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
  );
}