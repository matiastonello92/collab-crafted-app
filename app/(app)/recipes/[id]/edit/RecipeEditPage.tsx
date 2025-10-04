'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { RecipeEditorForm } from '../../components/RecipeEditorForm';
import { RecipeBreadcrumb } from '../../components/RecipeBreadcrumb';
import { RecipeProgressStepper } from '../../components/RecipeProgressStepper';
import { RecipeSummaryCard } from '../../components/RecipeSummaryCard';
import { t } from '@/lib/i18n';

interface RecipeEditPageProps {
  recipeId: string;
}

export default function RecipeEditPage({ recipeId }: RecipeEditPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'info' | 'ingredients' | 'steps') || 'info';
  
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>(initialTab);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error(t('recipe.notFound'));
      
      const data = await response.json();
      const recipeData = data.recipe;

      // Check permissions
      if (recipeData.status !== 'draft') {
        toast.error(t('recipe.cannotEdit'));
        router.push(`/recipes/${recipeId}`);
        return;
      }

      if (!data.recipe.can_edit) {
        toast.error(t('recipe.noPermission'));
        router.push(`/recipes/${recipeId}`);
        return;
      }

      setRecipe(recipeData);
      setCanEdit(true);
    } catch (error: any) {
      console.error('Load error:', error);
      toast.error(error.message || t('recipe.loadError'));
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

  const completionStatus = {
    info: !!(recipe.title && recipe.category && recipe.servings > 0),
    ingredients: (recipe.recipe_ingredients?.length || 0) > 0,
    steps: (recipe.recipe_steps?.length || 0) > 0,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Breadcrumb */}
      <RecipeBreadcrumb mode="edit" recipeTitle={recipe.title} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/recipes/${recipeId}`)}
          aria-label={t('recipe.backToRecipe')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('recipe.editRecipe')}</h1>
          <p className="text-sm text-muted-foreground">{recipe.title}</p>
        </div>
      </div>

      {/* Progress Stepper */}
      <Card>
        <CardContent className="pt-6">
          <RecipeProgressStepper
            currentStep={activeTab}
            completionStatus={completionStatus}
            onStepClick={setActiveTab}
          />
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main Form */}
        <Card>
          <CardContent className="pt-6">
            <RecipeEditorForm
              recipeId={recipeId}
              mode="edit"
              initialTab={activeTab}
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

        {/* Sidebar Summary */}
        <RecipeSummaryCard
          title={recipe.title}
          category={recipe.category}
          servings={recipe.servings}
          photoUrl={recipe.photo_url}
          ingredientsCount={recipe.recipe_ingredients?.length || 0}
          stepsCount={recipe.recipe_steps?.length || 0}
        />
      </div>
    </div>
  );
}
