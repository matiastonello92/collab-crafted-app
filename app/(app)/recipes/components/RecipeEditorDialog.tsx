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
import { RecipePhotoUploader } from './RecipePhotoUploader';
import { AllergenSelector } from './AllergenSelector';
import { SeasonSelector } from './SeasonSelector';
import { ScalableIngredient } from '@/lib/recipes/scaling';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { useTranslation } from '@/lib/i18n';

interface RecipeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORY_VALUES = [
  'main_course',
  'appetizer',
  'dessert',
  'beverage',
  'side_dish',
  'soup',
  'salad',
  'breakfast',
  'other'
] as const;

export function RecipeEditorDialog({
  open,
  onOpenChange,
  onSuccess
}: RecipeEditorDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('main_course');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState(0);
  const [cookTime, setCookTime] = useState(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [ingredients, setIngredients] = useState<ScalableIngredient[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [season, setSeason] = useState<string[]>([]);

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
        toast.error(t('recipes.editor.toast.authError'));
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
    setPrepTime(0);
    setCookTime(0);
    setPhotoUrl('');
    setIngredients([]);
    setAllergens([]);
    setSeason([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = async () => {
    // P1: Enhanced validation
    if (!title.trim()) {
      toast.error(t('recipes.editor.validation.titleRequired'));
      return;
    }
    if (!category) {
      toast.error(t('recipes.editor.validation.categoryRequired'));
      return;
    }
    if (!servings || servings < 1) {
      toast.error(t('recipes.editor.validation.servingsMin'));
      return;
    }
    if (ingredients.length === 0) {
      toast.error(t('recipes.editor.validation.ingredientsRequired'));
      return;
    }
    const hasValidIngredient = ingredients.some(ing => 
      ing.quantity && parseFloat(ing.quantity.toString()) > 0
    );
    if (!hasValidIngredient) {
      toast.error(t('recipes.editor.validation.ingredientQuantityRequired'));
      return;
    }
    if (!photoUrl) {
      toast.error(t('recipes.editor.validation.photoRequired'));
      return;
    }
    if (!orgId || !locationId) {
      toast.error(t('recipes.editor.validation.contextMissing'));
      return;
    }

    // Valida ingredienti
    const incompleteIngredients = ingredients.filter(
      ing => !ing.catalog_item_id || ing.quantity <= 0
    );

    if (incompleteIngredients.length > 0) {
      toast.error(t('recipes.editor.validation.incompleteIngredients'));
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
        photo_url: photoUrl,
        allergens: allergens.length > 0 ? allergens : undefined,
        season: season.length > 0 ? season : undefined,
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

      toast.success(t('recipes.editor.toast.success'));
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save recipe:', error);
      toast.error(t('recipes.editor.toast.error'), {
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
          <DialogTitle>{t('recipes.editor.title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">{t('recipes.editor.tabs.info')}</TabsTrigger>
            <TabsTrigger value="ingredients">{t('recipes.editor.tabs.ingredients')}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Titolo */}
            <div>
              <Label htmlFor="title">{t('recipes.editor.form.titleLabel')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('recipes.editor.form.titlePlaceholder')}
                maxLength={200}
              />
            </div>

            {/* Descrizione */}
            <div>
              <Label htmlFor="description">{t('recipes.editor.form.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('recipes.editor.form.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">{t('recipes.editor.form.categoryLabel')} *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_VALUES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {t(`recipes.categories.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photo Upload */}
            <div>
              <RecipePhotoUploader
                currentUrl={photoUrl}
                onPhotoUpdate={setPhotoUrl}
              />
            </div>

            {/* Allergens */}
            <div>
              <AllergenSelector
                selectedAllergens={allergens}
                onAllergensChange={setAllergens}
                label={t('recipes.editor.form.allergensLabel')}
                placeholder={t('recipes.editor.form.allergensPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('recipes.editor.form.allergensHelp')}
              </p>
            </div>

            {/* Stagionalità */}
            <div>
              <SeasonSelector
                selectedMonths={season}
                onMonthsChange={setSeason}
                label={t('recipes.editor.form.seasonLabel')}
                placeholder={t('recipes.editor.form.seasonPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('recipes.editor.form.seasonHelp')}
              </p>
            </div>

            {/* Porzioni */}
            <div>
              <Label htmlFor="servings">{t('recipes.editor.form.servingsLabel')} *</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                max="100"
                value={servings}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setServings(val);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('recipes.editor.form.servingsHelp')}
              </p>
            </div>

            {/* Tempi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepTime">{t('recipes.editor.form.prepTimeLabel')}</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="cookTime">{t('recipes.editor.form.cookTimeLabel')}</Label>
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
            {/* Ingredients Form */}
            <IngredientsForm
              ingredients={ingredients}
              onIngredientsChange={setIngredients}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            <X className="w-4 h-4 mr-1" />
            {t('recipes.editor.buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? t('recipes.editor.buttons.saving') : t('recipes.editor.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
