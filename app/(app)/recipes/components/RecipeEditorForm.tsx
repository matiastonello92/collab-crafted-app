'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { IngredientsForm } from './IngredientsForm';
import { StepsEditor } from './StepsEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { COMMON_ALLERGENS } from '../constants/allergens';
import { MONTHS } from '../constants/seasons';

const CATEGORIES = [
  { value: 'antipasto', label: 'Antipasto' },
  { value: 'primo', label: 'Primo' },
  { value: 'secondo', label: 'Secondo' },
  { value: 'contorno', label: 'Contorno' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'bevanda', label: 'Bevanda' },
];

interface RecipeEditorFormProps {
  recipeId?: string;
  initialData?: {
    title?: string;
    description?: string;
    category?: string;
    servings?: number;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    photo_url?: string;
    allergens?: string[];
    season?: string[];
    ingredients?: any[];
    steps?: any[];
  };
  mode?: 'create' | 'edit';
  initialTab?: 'info' | 'ingredients' | 'steps';
  onSuccess?: (recipeId: string) => void;
  onCancel?: () => void;
}

export function RecipeEditorForm({
  recipeId,
  initialData,
  mode = 'create',
  initialTab = 'info',
  onSuccess,
  onCancel
}: RecipeEditorFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [servings, setServings] = useState(initialData?.servings || 4);
  const [prepTime, setPrepTime] = useState(initialData?.prep_time_minutes || 30);
  const [cookTime, setCookTime] = useState(initialData?.cook_time_minutes || 30);
  const [photoUrl, setPhotoUrl] = useState(initialData?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [ingredients, setIngredients] = useState<any[]>(initialData?.ingredients || []);
  const [steps, setSteps] = useState<any[]>(initialData?.steps || []);
  const [allergens, setAllergens] = useState<string[]>(initialData?.allergens || []);
  const [seasonMonths, setSeasonMonths] = useState<string[]>(initialData?.season || []);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>(initialTab);

  useEffect(() => {
    loadUserContext();
  }, []);

  async function loadRecipeSteps() {
    if (!recipeId) return;
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (response.ok) {
        const data = await response.json();
        setSteps(data.recipe.recipe_steps || []);
      }
    } catch (error) {
      console.error('Error loading steps:', error);
    }
  }

  useEffect(() => {
    // Track unsaved changes
    const hasChanges = 
      title !== (initialData?.title || '') ||
      description !== (initialData?.description || '') ||
      category !== (initialData?.category || '') ||
      servings !== (initialData?.servings || 4) ||
      prepTime !== (initialData?.prep_time_minutes || 30) ||
      cookTime !== (initialData?.cook_time_minutes || 30);
    
    setIsDirty(hasChanges);
  }, [title, description, category, servings, prepTime, cookTime, initialData]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && onCancel) {
        if (!isDirty || confirm('Hai modifiche non salvate. Vuoi davvero uscire?')) {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, title, description, category, ingredients]);

  async function loadUserContext() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, default_location_id')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setOrgId(profile.org_id);
        setLocationId(profile.default_location_id);
      }
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    setPhotoFile(file);
    setUploading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${orgId}/${locationId}/recipes/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('recipe-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
      toast.success('Foto caricata');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Errore caricamento foto');
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoUrl('');
    setPhotoFile(null);
  }

  function toggleAllergen(allergenKey: string) {
    setAllergens(prev =>
      prev.includes(allergenKey)
        ? prev.filter(a => a !== allergenKey)
        : [...prev, allergenKey]
    );
  }

  function toggleSeasonMonth(month: string) {
    setSeasonMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort()
    );
  }

  async function handleSave() {
    // Validation
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      setCurrentTab('info');
      return;
    }
    if (!category) {
      toast.error('Seleziona una categoria');
      setCurrentTab('info');
      return;
    }
    if (servings < 1) {
      toast.error('Le porzioni devono essere almeno 1');
      setCurrentTab('info');
      return;
    }
    if (ingredients.length === 0) {
      toast.error('Aggiungi almeno un ingrediente');
      setCurrentTab('ingredients');
      return;
    }

    // Check ingredient completeness
    const incompleteIngredients = ingredients.filter(
      ing => !ing.quantity || ing.quantity <= 0
    );
    if (incompleteIngredients.length > 0) {
      toast.error('Alcuni ingredienti hanno quantità mancanti o non valide');
      setCurrentTab('ingredients');
      return;
    }

    if (!orgId || !locationId) {
      toast.error('Contesto utente mancante');
      return;
    }

    // Warning for missing photo
    if (!photoUrl) {
      const proceed = confirm('La ricetta non ha una foto. Vuoi comunque salvare?');
      if (!proceed) return;
    }

    // Warning for missing steps (only if creating new recipe)
    if (mode === 'create' && steps.length === 0) {
      toast.info('Potrai aggiungere gli step di preparazione dopo il salvataggio');
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        servings,
        prep_time_minutes: prepTime,
        cook_time_minutes: cookTime,
        photo_url: photoUrl || null,
        allergens: allergens.length > 0 ? allergens : null,
        season: seasonMonths.length > 0 ? seasonMonths : null,
        org_id: orgId,
        location_id: locationId,
        ingredients: ingredients.map((ing, idx) => ({
          sort_order: idx,
          quantity: ing.quantity,
          unit: ing.unit,
          catalog_item_id: ing.catalog_item_id || null,
          sub_recipe_id: ing.sub_recipe_id || null,
          item_name_snapshot: ing.item_name_snapshot || ing.name,
          notes: ing.notes || null,
          is_optional: ing.is_optional || false,
        })),
      };

      let response;
      if (mode === 'edit' && recipeId) {
        response = await fetch(`/api/v1/recipes/${recipeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/v1/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore salvataggio');
      }

      const data = await response.json();
      const savedRecipeId = data.recipe?.id || recipeId;

      toast.success(mode === 'edit' ? 'Ricetta aggiornata' : 'Ricetta creata! Aggiungi ora gli step di preparazione');
      setIsDirty(false);

      if (onSuccess) {
        onSuccess(savedRecipeId);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Errore salvataggio ricetta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informazioni Base</TabsTrigger>
          <TabsTrigger value="ingredients">
            Ingredienti
            {ingredients.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {ingredients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="steps" disabled={!recipeId}>
            Preparazione
            {recipeId && steps.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {steps.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es: Carbonara tradizionale"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrizione della ricetta..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings">Porzioni *</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTime">Tempo Preparazione (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookTime">Tempo Cottura (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto Ricetta</Label>
              {photoUrl ? (
                <div className="relative inline-block">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="h-40 w-auto rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allergeni</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((allergen) => (
                  <div key={allergen.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`allergen-${allergen.key}`}
                      checked={allergens.includes(allergen.key)}
                      onCheckedChange={() => toggleAllergen(allergen.key)}
                    />
                    <Label
                      htmlFor={`allergen-${allergen.key}`}
                      className="text-sm cursor-pointer"
                    >
                      {allergen.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stagionalità (mesi consigliati)</Label>
              <div className="flex flex-wrap gap-2">
                {MONTHS.map((month) => (
                  <div key={month.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`month-${month.key}`}
                      checked={seasonMonths.includes(month.key)}
                      onCheckedChange={() => toggleSeasonMonth(month.key)}
                    />
                    <Label
                      htmlFor={`month-${month.key}`}
                      className="text-sm cursor-pointer"
                    >
                      {month.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients" className="space-y-4">
          <IngredientsForm
            ingredients={ingredients}
            onIngredientsChange={setIngredients}
            readOnly={false}
            currentRecipeId={recipeId}
          />
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          {recipeId ? (
            <StepsEditor
              recipeId={recipeId}
              steps={steps}
              readOnly={false}
              onStepsChange={() => {
                // Reload steps from API after change
                loadRecipeSteps();
              }}
            />
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Salva prima la ricetta per aggiungere gli step di preparazione
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (!isDirty || confirm('Hai modifiche non salvate. Vuoi davvero uscire?')) {
                onCancel();
              }
            }}
          >
            Annulla
          </Button>
        )}
        
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !category || ingredients.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              mode === 'edit' ? 'Salva Modifiche' : 'Salva Bozza'
            )}
          </Button>
        </div>
      </div>

      {isDirty && (
        <p className="text-xs text-muted-foreground text-center">
          Modifiche non salvate • Usa Ctrl/Cmd+S per salvare velocemente
        </p>
      )}
    </div>
  );
}
