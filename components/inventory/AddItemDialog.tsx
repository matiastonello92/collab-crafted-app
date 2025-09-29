'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
}

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  headerId: string;
  orgId: string;
  locationId: string;
  category: string;
}

export function AddItemDialog({
  open,
  onClose,
  onSuccess,
  headerId,
  orgId,
  locationId,
  category
}: AddItemDialogProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addToTemplate, setAddToTemplate] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCatalogItems();
    }
  }, [open, orgId, locationId, category]);

  const loadCatalogItems = async () => {
    try {
      const response = await fetch(`/api/v1/inventory/catalog?org_id=${orgId}&location_id=${locationId}&category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setCatalogItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading catalog items:', error);
      toast.error('Errore nel caricamento prodotti');
    }
  };

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error('Seleziona un prodotto');
      return;
    }

    setLoading(true);
    try {
      const item = catalogItems.find(i => i.id === selectedItem);
      if (!item) return;

      const response = await fetch('/api/v1/inventory/lines/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header_id: headerId,
          lines: [{
            catalog_item_id: selectedItem,
            qty: quantity,
            unit_price_snapshot: item.default_unit_price
          }]
        }),
      });

      if (response.ok) {
        toast.success('Prodotto aggiunto con successo');
        onSuccess();
        resetForm();
        onClose();
      } else {
        toast.error('Errore durante l\'aggiunta del prodotto');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Errore durante l\'aggiunta del prodotto');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedItem('');
    setQuantity(1);
    setAddToTemplate(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi Prodotto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Prodotto</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un prodotto" />
              </SelectTrigger>
              <SelectContent>
                {catalogItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - {item.uom} (€{item.default_unit_price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantità</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="add-to-template"
              checked={addToTemplate}
              onCheckedChange={setAddToTemplate}
            />
            <Label htmlFor="add-to-template">Aggiungi anche al template</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleAddItem} disabled={loading}>
            {loading ? 'Aggiungendo...' : 'Aggiungi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}