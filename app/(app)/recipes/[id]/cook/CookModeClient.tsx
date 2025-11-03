'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  ArrowRight, 
  ChefHat, 
  X,
  Clock,
  ListChecks
} from 'lucide-react';
import { toast } from 'sonner';
import { TimerWidget } from './components/TimerWidget';
import { ChecklistWidget } from './components/ChecklistWidget';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, StickyNote } from 'lucide-react';
import { DownloadPdfButton } from '../../components/DownloadPdfButton';
import { RecipeStepImage } from '../../components/RecipeStepImage';
import { useTranslation } from '@/lib/i18n';

interface RecipeStep {
  id: string;
  step_number: number;
  title?: string;
  instruction: string;
  timer_minutes?: number;
  checklist_items?: string[];
  photo_url?: string;
}

interface Recipe {
  id: string;
  title: string;
  servings: number;
  status?: string;
  recipe_steps: RecipeStep[];
  recipe_service_notes?: Array<{
    id: string;
    note_text: string;
    created_at: string;
    created_by_profile?: { full_name: string };
  }>;
}

interface CookModeClientProps {
  recipeId: string;
}

export default function CookModeClient({ recipeId }: CookModeClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    loadRecipe();
    
    // Log Cook Mode usage
    fetch(`/api/v1/recipes/${recipeId}/log-usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'cook_mode_opened' })
    }).catch(err => console.error('Failed to log usage:', err));
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Failed to load recipe');
      
      const data = await response.json();
      setRecipe({
        id: data.recipe.id,
        title: data.recipe.title,
        servings: data.recipe.servings || 4,
        status: data.recipe.status,
        recipe_steps: data.recipe.recipe_steps?.sort((a: RecipeStep, b: RecipeStep) => 
          a.step_number - b.step_number
        ) || [],
        recipe_service_notes: data.recipe.recipe_service_notes || []
      });
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast.error(t('recipes.cook.loadError'));
    } finally {
      setLoading(false);
    }
  }

  function handleExit() {
    router.push(`/recipes/${recipeId}`);
  }

  function handlePrevStep() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  function handleNextStep() {
    if (recipe && currentStepIndex < recipe.recipe_steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, recipe]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center space-y-4">
          <ChefHat className="h-16 w-16 mx-auto text-primary" />
          <p className="text-muted-foreground">{t('recipes.cook.loading')}</p>
        </div>
      </div>
    );
  }

  if (!recipe || recipe.recipe_steps.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{t('recipes.cook.noProcedure')}</p>
            <Button onClick={handleExit}>{t('recipes.cook.backToRecipe')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = recipe.recipe_steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / recipe.recipe_steps.length) * 100;
  const isDraft = recipe.status === 'draft';

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            className="h-12 w-12"
          >
            <X className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{recipe.title}</h1>
              {isDraft && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                  BOZZA
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('recipes.cook.stepOf')
                .replace('{current}', String(currentStepIndex + 1))
                .replace('{total}', String(recipe.recipe_steps.length))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recipe.recipe_service_notes && recipe.recipe_service_notes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowNotes(true)} className="gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              {t('recipes.cook.notes')} ({recipe.recipe_service_notes.length})
            </Button>
          )}
          <DownloadPdfButton 
            recipeId={recipeId}
            defaultServings={recipe.servings}
            defaultVariant="station"
            isDraft={isDraft}
          />
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {currentStep.step_number}
          </Badge>
        </div>
      </div>

      {/* Service Notes Dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              {t('recipes.cook.serviceNotes')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recipe.recipe_service_notes?.map((note) => (
              <div key={note.id} className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {note.created_by_profile?.full_name || 'Utente'}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Bar */}
      <Progress value={progress} className="mb-6 h-2" />

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-2 gap-6">
        {/* Step Card */}
        <Card className="h-fit">
          <CardContent className="p-6 space-y-6">
            {currentStep.photo_url && (
              <RecipeStepImage 
                photoUrl={currentStep.photo_url}
                stepTitle={currentStep.title || `Step ${currentStep.step_number}`}
                className="h-64 w-full"
              />
            )}

            {currentStep.title && (
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            )}

            <div className="prose prose-sm max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">
                {currentStep.instruction}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentStep.timer_minutes && currentStep.timer_minutes > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {currentStep.timer_minutes} min
                </Badge>
              )}
              {currentStep.checklist_items && currentStep.checklist_items.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <ListChecks className="h-3 w-3" />
                  {currentStep.checklist_items.length} items
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Widgets */}
        <div className="space-y-6">
          {currentStep.timer_minutes && currentStep.timer_minutes > 0 && (
            <TimerWidget 
              minutes={currentStep.timer_minutes}
              stepNumber={currentStep.step_number}
            />
          )}

          {currentStep.checklist_items && currentStep.checklist_items.length > 0 && (
            <ChecklistWidget
              items={currentStep.checklist_items}
              recipeId={recipeId}
              stepNumber={currentStep.step_number}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className="gap-2 min-w-[120px]"
          aria-label={t('recipes.cook.previousAriaLabel')}
        >
          <ArrowLeft className="h-5 w-5" />
          {t('recipes.cook.previous')}
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={currentStepIndex === recipe.recipe_steps.length - 1}
          className="gap-2 min-w-[120px]"
          aria-label={t('recipes.cook.nextAriaLabel')}
        >
          {t('recipes.cook.next')}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
