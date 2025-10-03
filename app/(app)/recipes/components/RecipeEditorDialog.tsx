'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';
import { IngredientsForm } from './IngredientsForm';
import { PortionScaler } from './PortionScaler';
import { ScalableIngredient } from '@/lib/recipes/scaling';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

interface RecipeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'main_course', label: 'Primo/Secondo' },
  { value: 'appetizer', label: 'Antipasto' },
  { value: 'dessert', label: 'Dolce' },
  { value: 'beverage', label: 'Bevanda' },
  { value: 'side_dish', label: 'Contorno' },
  { value: 'soup', label: 'Zuppa' },
  { value: 'salad', label: 'Insalata' },
  { value: 'breakfast', label: 'Colazione' },
  { value: 'other', label: 'Altro' }
];

export function RecipeEditorDialog({
  open,
  onOpenChange,
  onSuccess
}: RecipeEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('main_course');
  const [servings, setServings] = useState(4);
  const [currentServings, setCurrentServings] = useState(4);
  const [prepTime, setPrepTime] = useState(0);
  const [cookTime, setCookTime] = useState(0);
  const [ingredients, setIngredients] = useState<ScalableIngredient[]>([]);

  useEffect(() => {
    if (open) {
      loadUserContext();
    }
  }, [open]);

  async function loadUserContext() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Utente non autenticato');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, default_location_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setOrgId(profile.org_id);
        setLocationId(profile.default_location_id);
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  }

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('main_course');
    setServings(4);
    setCurrentServings(4);
    setPrepTime(0);
    setCookTime(0);
    setIngredients([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = async () => {
    // Validazione base
    if (!title.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }

    if (!orgId || !locationId) {
      toast.error('Contesto organizzazione mancante');
      return;
    }

    // Valida ingredienti
    const incompleteIngredients = ingredients.filter(
      ing => !ing.catalog_item_id || ing.quantity <= 0
    );

    if (incompleteIngredients.length > 0) {
      toast.error('Completa tutti gli ingredienti o rimuovili');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        org_id: orgId,
        location_id: locationId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        servings,
        prep_time_minutes: prepTime,
        cook_time_minutes: cookTime,
        ingredients: ingredients.length > 0 ? ingredients : undefined
      };

      const response = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create recipe');
      }

      toast.success('Ricetta creata con successo');
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save recipe:', error);
      toast.error('Errore salvataggio ricetta', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuova Ricetta</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informazioni Base</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredienti</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Titolo */}
            <div>
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="es. Risotto ai Funghi"
                maxLength={200}
              />
            </div>

            {/* Descrizione */}
            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrizione della ricetta..."
                rows={3}
              />
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Porzioni */}
            <div>
              <Label htmlFor="servings">Porzioni Standard *</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                max="100"
                value={servings}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setServings(val);
                    setCurrentServings(val);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Numero di porzioni per cui è calcolata la ricetta
              </p>
            </div>

            {/* Tempi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepTime">Tempo Preparazione (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="cookTime">Tempo Cottura (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4 mt-4">
            {/* Portion Scaler */}
            <PortionScaler
              originalServings={servings}
              currentServings={currentServings}
              onServingsChange={setCurrentServings}
            />

            {/* Ingredients Form */}
            <IngredientsForm
              ingredients={ingredients}
              originalServings={servings}
              currentServings={currentServings}
              onIngredientsChange={setIngredients}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            <X className="w-4 h-4 mr-1" />
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? 'Salvataggio...' : 'Salva Bozza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
