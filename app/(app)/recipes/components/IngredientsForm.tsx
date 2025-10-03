'use client';

import { useState, useEffect } from 'react';
import { ScalableIngredient, IngredientType } from '@/lib/recipes/scaling';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ChefHat, Package } from 'lucide-react';
import { SubRecipePicker } from './SubRecipePicker';
import { SubRecipeCard } from './SubRecipeCard';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  uom: string;
  category: string;
}

interface IngredientsFormProps {
  ingredients: ScalableIngredient[];
  onIngredientsChange: (ingredients: ScalableIngredient[]) => void;
  readOnly?: boolean;
  currentRecipeId?: string;
}

export function IngredientsForm({ 
  ingredients, 
  onIngredientsChange, 
  readOnly = false,
  currentRecipeId
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

  function addIngredient(type: IngredientType = 'catalog') {
    const newIngredient: ScalableIngredient = {
      catalog_item_id: type === 'catalog' ? '' : null,
      sub_recipe_id: type === 'sub_recipe' ? '' : null,
      quantity: 0,
      unit: type === 'sub_recipe' ? 'porzioni' : '',
      item_name_snapshot: '',
      is_optional: false,
      notes: '',
      sort_order: ingredients.length
    };
    onIngredientsChange([...ingredients, newIngredient]);
  }

  function updateIngredient(index: number, field: keyof ScalableIngredient, value: any) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-populate unit and name when catalog item is selected
    if (field === 'catalog_item_id' && value) {
      const item = catalogItems.find(i => i.id === value);
      if (item) {
        updated[index].unit = item.uom;
        updated[index].item_name_snapshot = item.name;
      }
    }

    onIngredientsChange(updated);
  }

  function updateIngredientType(index: number, type: IngredientType) {
    const updated = [...ingredients];
    if (type === 'catalog') {
      updated[index] = {
        ...updated[index],
        catalog_item_id: '',
        sub_recipe_id: null,
        unit: '',
        item_name_snapshot: '',
        sub_recipe: undefined
      };
    } else {
      updated[index] = {
        ...updated[index],
        catalog_item_id: null,
        sub_recipe_id: '',
        unit: 'porzioni',
        item_name_snapshot: ''
      };
    }
    onIngredientsChange(updated);
  }

  function updateSubRecipe(index: number, recipeId: string | null, recipe: any) {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      sub_recipe_id: recipeId,
      item_name_snapshot: recipe?.title || '',
      sub_recipe: recipe || undefined
    };
    onIngredientsChange(updated);
  }

  function removeIngredient(index: number) {
    const updated = ingredients.filter((_, i) => i !== index);
    updated.forEach((ing, i) => {
      ing.sort_order = i;
    });
    onIngredientsChange(updated);
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Caricamento prodotti...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ingredienti</h3>
        {!readOnly && (
          <div className="flex gap-2">
            <Button onClick={() => addIngredient('catalog')} size="sm" variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Prodotto
            </Button>
            <Button onClick={() => addIngredient('sub_recipe')} size="sm" variant="outline">
              <ChefHat className="h-4 w-4 mr-2" />
              Sub-Ricetta
            </Button>
          </div>
        )}
      </div>

      {ingredients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nessun ingrediente. Clicca su &quot;Prodotto&quot; o &quot;Sub-Ricetta&quot; per iniziare.
          </CardContent>
        </Card>
      ) : (
        ingredients.map((ingredient, index) => {
          const ingredientType: IngredientType = ingredient.sub_recipe_id ? 'sub_recipe' : 'catalog';
          const isSubRecipe = ingredientType === 'sub_recipe';

          return (
            <Card key={index} className={isSubRecipe ? 'border-primary/50' : ''}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {readOnly ? (
                    <>
                      <div className="flex items-center gap-2">
                        {isSubRecipe ? (
                          <Badge variant="default" className="gap-1">
                            <ChefHat className="h-3 w-3" />
                            Sub-Ricetta
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Package className="h-3 w-3" />
                            Prodotto
                          </Badge>
                        )}
                      </div>
                      
                      {isSubRecipe && ingredient.sub_recipe ? (
                        <SubRecipeCard
                          subRecipe={ingredient.sub_recipe}
                          requestedServings={ingredient.quantity}
                        />
                      ) : (
                        <>
                          <div>
                            <Label className="text-sm text-muted-foreground">Prodotto</Label>
                            <p className="font-medium">{ingredient.item_name_snapshot}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-muted-foreground">Quantità</Label>
                              <p>{ingredient.quantity} {ingredient.unit}</p>
                            </div>
                            {ingredient.is_optional && (
                              <div>
                                <Badge variant="secondary">Opzionale</Badge>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {ingredient.notes && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Note</Label>
                          <p className="text-sm">{ingredient.notes}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Label>Tipo</Label>
                        <Select
                          value={ingredientType}
                          onValueChange={(value: IngredientType) => updateIngredientType(index, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="catalog">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Prodotto
                              </div>
                            </SelectItem>
                            <SelectItem value="sub_recipe">
                              <div className="flex items-center gap-2">
                                <ChefHat className="h-4 w-4" />
                                Sub-Ricetta
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {isSubRecipe ? (
                        <>
                          <SubRecipePicker
                            value={ingredient.sub_recipe_id || null}
                            onChange={(recipeId, recipe) => updateSubRecipe(index, recipeId, recipe)}
                            excludeRecipeId={currentRecipeId}
                          />
                          
                          <div>
                            <Label>Porzioni necessarie</Label>
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              value={ingredient.quantity || ''}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          {ingredient.sub_recipe && (
                            <SubRecipeCard
                              subRecipe={ingredient.sub_recipe}
                              requestedServings={ingredient.quantity}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <Label>Prodotto</Label>
                            <Select
                              value={ingredient.catalog_item_id || ''}
                              onValueChange={(value) => updateIngredient(index, 'catalog_item_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleziona prodotto" />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.category})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Quantità</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={ingredient.quantity || ''}
                                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label>Unità</Label>
                              <Input
                                value={ingredient.unit}
                                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                disabled
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <Label>Note (opzionale)</Label>
                        <Textarea
                          value={ingredient.notes || ''}
                          onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                          rows={2}
                        />
                      </div>

                      {!isSubRecipe && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`optional-${index}`}
                            checked={ingredient.is_optional}
                            onCheckedChange={(checked) => updateIngredient(index, 'is_optional', checked)}
                          />
                          <label
                            htmlFor={`optional-${index}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Ingrediente opzionale
                          </label>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Rimuovi
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
