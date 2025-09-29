'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, Edit } from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  default_unit_price: number;
  category: string;
}

interface TemplateItem {
  catalog_item_id: string;
  catalog_item: CatalogItem;
  section?: 'pantry' | 'fridge' | 'freezer';
  sort_order: number;
  uom_override?: string;
  unit_price_override?: number;
}

interface TemplateItemsManagerProps {
  items: TemplateItem[];
  onItemsChange: (items: TemplateItem[]) => void;
}

export function TemplateItemsManager({
  items,
  onItemsChange
}: TemplateItemsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const sectionLabels = {
    pantry: 'Dispensa',
    fridge: 'Frigo',
    freezer: 'Freezer'
  };

  const sectionColors = {
    pantry: 'bg-orange-100 text-orange-800',
    fridge: 'bg-blue-100 text-blue-800',
    freezer: 'bg-cyan-100 text-cyan-800'
  };

  const handleSectionChange = (itemId: string, section: string) => {
    const updatedItems = items.map(item =>
      item.catalog_item_id === itemId
        ? { ...item, section: section as 'pantry' | 'fridge' | 'freezer' }
        : item
    );
    onItemsChange(updatedItems);
  };

  const handleOverrideChange = (itemId: string, field: string, value: string) => {
    const updatedItems = items.map(item =>
      item.catalog_item_id === itemId
        ? { 
            ...item, 
            [field]: field === 'unit_price_override' ? (value ? parseFloat(value) : undefined) : (value || undefined)
          }
        : item
    );
    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = items.filter(item => item.catalog_item_id !== itemId);
    onItemsChange(updatedItems);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    // Update sort_order
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    
    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Organizza Prodotti</h3>
        <div className="text-sm text-muted-foreground">
          {items.length} prodotti
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={item.catalog_item_id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-background"
          >
            <div className="cursor-move text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.catalog_item.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.catalog_item_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Select
                    value={item.section || ''}
                    onValueChange={(value) => handleSectionChange(item.catalog_item_id, value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Sezione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pantry">Dispensa</SelectItem>
                      <SelectItem value="fridge">Frigo</SelectItem>
                      <SelectItem value="freezer">Freezer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder={item.catalog_item.uom}
                  value={item.uom_override || ''}
                  onChange={(e) => handleOverrideChange(item.catalog_item_id, 'uom_override', e.target.value)}
                  className="h-8"
                />

                <Input
                  type="number"
                  step="0.01"
                  placeholder={`€${item.catalog_item.default_unit_price}`}
                  value={item.unit_price_override || ''}
                  onChange={(e) => handleOverrideChange(item.catalog_item_id, 'unit_price_override', e.target.value)}
                  className="h-8"
                />
              </div>

              {item.section && (
                <Badge className={sectionColors[item.section]}>
                  {sectionLabels[item.section]}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nessun prodotto selezionato. Torna al passo precedente per aggiungerne.
        </div>
      )}
    </div>
  );
}