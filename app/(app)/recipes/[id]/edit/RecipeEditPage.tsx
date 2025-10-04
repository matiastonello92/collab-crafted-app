'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { RecipeEditorForm } from '../../components/RecipeEditorForm';

interface RecipeEditPageProps {
  recipeId: string;
}

export default function RecipeEditPage({ recipeId }: RecipeEditPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'info';
  
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Ricetta non trovata');
      
      const data = await response.json();
      const recipeData = data.recipe;

      // Check permissions
      if (recipeData.status !== 'draft') {
        toast.error('Solo le bozze possono essere modificate');
        router.push(`/recipes/${recipeId}`);
        return;
      }

      if (!data.recipe.can_edit) {
        toast.error('Non hai i permessi per modificare questa ricetta');
        router.push(`/recipes/${recipeId}`);
        return;
      }

      setRecipe(recipeData);
      setCanEdit(true);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error(error.message || 'Errore caricamento ricetta');
      router.push('/recipes');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!recipe || !canEdit) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/recipes/${recipeId}`)}
          aria-label="Torna alla ricetta"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Modifica Ricetta</h1>
          <p className="text-sm text-muted-foreground">{recipe.title}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RecipeEditorForm
            recipeId={recipeId}
            mode="edit"
            initialData={{
              title: recipe.title,
              description: recipe.description,
              category: recipe.category,
              servings: recipe.servings,
              prep_time_minutes: recipe.prep_time_minutes,
              cook_time_minutes: recipe.cook_time_minutes,
              photo_url: recipe.photo_url,
              allergens: recipe.allergens,
              season: recipe.season,
              ingredients: recipe.recipe_ingredients || [],
              steps: recipe.recipe_steps || [],
            }}
            onSuccess={(id) => {
              router.push(`/recipes/${id}`);
            }}
            onCancel={() => router.push(`/recipes/${recipeId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
