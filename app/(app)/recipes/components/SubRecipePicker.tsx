'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChefHat } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface SubRecipe {
  id: string;
  title: string;
  servings: number;
  photo_url?: string;
}

interface SubRecipePickerProps {
  value: string | null;
  onChange: (recipeId: string | null, recipe: SubRecipe | null) => void;
  excludeRecipeId?: string;
  disabled?: boolean;
}

export function SubRecipePicker({ 
  value, 
  onChange, 
  excludeRecipeId,
  disabled = false 
}: SubRecipePickerProps) {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<SubRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublishedRecipes();
  }, [excludeRecipeId]);

  async function loadPublishedRecipes() {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      
      let query = supabase
        .from('recipes')
        .select('id, title, servings, photo_url')
        .eq('status', 'published')
        .eq('is_active', true)
        .order('title');

      if (excludeRecipeId) {
        query = query.neq('id', excludeRecipeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error(t('recipes.subRecipe.errorLoading'), error);
    } finally {
      setLoading(false);
    }
  }

  const handleValueChange = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    onChange(recipeId, recipe || null);
  };

  return (
    <div className="space-y-2">
      <Label>{t('recipes.subRecipe.label')}</Label>
      <Select
        value={value || ''}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? t('recipes.subRecipe.loading') : t('recipes.subRecipe.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {recipes.map((recipe) => (
            <SelectItem key={recipe.id} value={recipe.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={recipe.photo_url} alt={recipe.title} />
                  <AvatarFallback>
                    <ChefHat className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>{recipe.title}</span>
                <span className="text-muted-foreground text-xs">({recipe.servings} porz.)</span>
              </div>
            </SelectItem>
          ))}
          {recipes.length === 0 && !loading && (
            <SelectItem value="_none" disabled>
              {t('recipes.subRecipe.noRecipes')}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
