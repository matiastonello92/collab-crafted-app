'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecipeEditorForm } from '../components/RecipeEditorForm';
import { RecipeBreadcrumb } from '../components/RecipeBreadcrumb';
import { RecipeProgressStepper } from '../components/RecipeProgressStepper';
import { RecipeSummaryCard } from '../components/RecipeSummaryCard';
import { useState } from 'react';

export default function RecipeEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'info' | 'ingredients' | 'steps') || 'info';

  // Form state for summary card
  const [formState, setFormState] = useState({
    title: '',
    category: '',
    servings: 0,
    photoUrl: '',
    ingredientsCount: 0,
    stepsCount: 0,
  });

  const [activeTab, setActiveTab] = useState<'info' | 'ingredients' | 'steps'>(initialTab);

  const completionStatus = {
    info: !!(formState.title && formState.category && formState.servings > 0),
    ingredients: formState.ingredientsCount > 0,
    steps: formState.stepsCount > 0,
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Breadcrumb */}
      <RecipeBreadcrumb mode="create" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/recipes')}
          aria-label="Torna alle ricette"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nuova Ricetta</h1>
          <p className="text-sm text-muted-foreground">
            Compila tutti i campi per creare una nuova ricetta
          </p>
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
              mode="create"
              initialTab={activeTab}
              onSuccess={(recipeId) => {
                router.push(`/recipes/${recipeId}/edit?tab=steps`);
              }}
              onCancel={() => router.push('/recipes')}
            />
          </CardContent>
        </Card>

        {/* Sidebar Summary */}
        <RecipeSummaryCard
          title={formState.title}
          category={formState.category}
          servings={formState.servings}
          photoUrl={formState.photoUrl}
          ingredientsCount={formState.ingredientsCount}
          stepsCount={formState.stepsCount}
        />
      </div>
    </div>
  );
}
