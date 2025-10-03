'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { ScalableIngredient, scaleIngredients, formatQuantity } from '@/lib/recipes/scaling';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  uom: string;
}

interface IngredientsFormProps {
  ingredients: ScalableIngredient[];
  originalServings: number;
  currentServings: number;
  onIngredientsChange: (ingredients: ScalableIngredient[]) => void;
  readOnly?: boolean;
}

export function IngredientsForm({
  ingredients,
  originalServings,
  currentServings,
  onIngredientsChange,
  readOnly = false
}: IngredientsFormProps) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalogItems();
  }, []);

  async function loadCatalogItems() {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      
      const { data, error } = await supabase
        .from('inventory_catalog_items')
        .select('id, name, category, uom')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCatalogItems(data || []);
    } catch (error: any) {
      console.error('Failed to load catalog items:', error);
      toast.error('Errore caricamento prodotti');
    } finally {
      setLoading(false);
    }
  }

  const addIngredient = () => {
    const newIngredient: ScalableIngredient = {
      catalog_item_id: '',
      quantity: 0,
      unit: '',
      item_name_snapshot: '',
      is_optional: false,
      notes: '',
      sort_order: ingredients.length
    };
    onIngredientsChange([...ingredients, newIngredient]);
  };

  const updateIngredient = (index: number, field: keyof ScalableIngredient, value: any) => {
    const updated = [...ingredients];
    
    // Se cambia il prodotto, aggiorna anche unit e snapshot
    if (field === 'catalog_item_id') {
      const selectedItem = catalogItems.find(item => item.id === value);
      if (selectedItem) {
        updated[index] = {
          ...updated[index],
          catalog_item_id: value,
          unit: selectedItem.uom,
          item_name_snapshot: selectedItem.name
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    onIngredientsChange(updated);
  };

  const removeIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    // Ricalcola sort_order
    updated.forEach((ing, i) => {
      ing.sort_order = i;
    });
    onIngredientsChange(updated);
  };

  // Scala gli ingredienti per display
  const displayIngredients = scaleIngredients(
    ingredients,
    originalServings,
    currentServings
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Caricamento prodotti...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Ingredienti</Label>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addIngredient}
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi
          </Button>
        )}
      </div>

      {ingredients.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nessun ingrediente. Clicca &quot;Aggiungi&quot; per iniziare.
        </Card>
      ) : (
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => {
            const displayQty = displayIngredients[index]?.quantity || ingredient.quantity;
            const isComplete = ingredient.catalog_item_id && ingredient.quantity > 0;

            return (
              <Card key={index} className={`p-4 ${!isComplete ? 'border-amber-300' : ''}`}>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    {!readOnly && (
                      <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-move" />
                    )}
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Prodotto */}
                      <div className="md:col-span-2">
                        <Label className="text-xs">Prodotto *</Label>
                        {readOnly ? (
                          <div className="text-sm font-medium mt-1">
                            {ingredient.item_name_snapshot}
                          </div>
                        ) : (
                          <Select
                            value={ingredient.catalog_item_id}
                            onValueChange={(value) => updateIngredient(index, 'catalog_item_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona prodotto" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} ({item.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Quantità */}
                      <div>
                        <Label className="text-xs">Quantità *</Label>
                        {readOnly ? (
                          <div className="text-sm mt-1">
                            {formatQuantity(displayQty)} {ingredient.unit}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={ingredient.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-16">
                              {ingredient.unit}
                            </span>
                          </div>
                        )}
                        {currentServings !== originalServings && readOnly && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Originale: {formatQuantity(ingredient.quantity)} {ingredient.unit}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <Label className="text-xs">Note</Label>
                        {readOnly ? (
                          <div className="text-sm mt-1 text-muted-foreground">
                            {ingredient.notes || '-'}
                          </div>
                        ) : (
                          <Input
                            value={ingredient.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            placeholder="es. a dadini, tritato..."
                            className="mt-1"
                          />
                        )}
                      </div>

                      {/* Opzionale */}
                      {!readOnly && (
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id={`optional-${index}`}
                            checked={ingredient.is_optional}
                            onCheckedChange={(checked) => updateIngredient(index, 'is_optional', checked)}
                          />
                          <Label htmlFor={`optional-${index}`} className="text-xs cursor-pointer">
                            Ingrediente opzionale
                          </Label>
                        </div>
                      )}
                    </div>

                    {!readOnly && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeIngredient(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
