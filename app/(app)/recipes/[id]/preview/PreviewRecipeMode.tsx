'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ChefHat, 
  Clock,
  Users,
  AlertTriangle,
  Calendar,
  ListChecks
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { formatTime } from '@/lib/recipes/scaling';
import { getAllergenLabel, getAllergenColor } from '../../constants/allergens';
import { formatSeasonRange, getSeasonColor } from '../../constants/seasons';
import { RecipeWorkflowBadge } from '../../components/RecipeWorkflowBadge';

interface Recipe {
  id: string;
  title: string;
  description?: string;
  category: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  photo_url?: string;
  status: string;
  created_at: string;
  allergens?: string[];
  season?: string[];
  recipe_ingredients: any[];
  recipe_steps: any[];
  recipe_service_notes?: any[];
  created_by_profile?: { full_name: string; avatar_url?: string };
}

interface PreviewRecipeModeProps {
  recipeId: string;
}

export default function PreviewRecipeMode({ recipeId }: PreviewRecipeModeProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Failed to load recipe');
      
      const data = await response.json();
      setRecipe(data.recipe);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast.error(t('recipes.detail.toast.loadError'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center space-y-4">
          <ChefHat className="h-16 w-16 mx-auto text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>{t('recipes.detail.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/recipes/${recipeId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>
          <RecipeWorkflowBadge status={recipe.status as any} />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Recipe Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {recipe.photo_url && (
              <Avatar className="h-[400px] w-full rounded-lg mb-6">
                <AvatarImage src={recipe.photo_url} alt={recipe.title} className="object-cover" />
                <AvatarFallback className="rounded-lg">
                  <ChefHat className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
            )}

            <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>
            
            {recipe.description && (
              <p className="text-lg text-muted-foreground mb-6">{recipe.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="secondary">{t(`categories.${recipe.category}`)}</Badge>
              
              {recipe.allergens && recipe.allergens.length > 0 && (
                <>
                  {recipe.allergens.map((allergenKey) => {
                    const color = getAllergenColor(allergenKey);
                    const label = getAllergenLabel(allergenKey);
                    return (
                      <Badge
                        key={allergenKey}
                        variant="secondary"
                        className="gap-1"
                        style={{
                          backgroundColor: `hsl(${color} / 0.15)`,
                          color: `hsl(${color})`,
                          borderColor: `hsl(${color} / 0.3)`
                        }}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {label}
                      </Badge>
                    );
                  })}
                </>
              )}

              {recipe.season && recipe.season.length > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                  style={{
                    backgroundColor: `hsl(${getSeasonColor(recipe.season)} / 0.15)`,
                    color: `hsl(${getSeasonColor(recipe.season)})`,
                    borderColor: `hsl(${getSeasonColor(recipe.season)} / 0.3)`
                  }}
                >
                  <Calendar className="h-3 w-3" />
                  {formatSeasonRange(recipe.season)}
                </Badge>
              )}
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('recipes.detail.servings')}</p>
                  <p className="font-medium">{recipe.servings}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('recipes.detail.preparation')}</p>
                  <p className="font-medium">{formatTime(recipe.prep_time_minutes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">{t('recipes.detail.total')}</p>
                  <p className="font-medium">{formatTime(totalTime)}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-sm text-muted-foreground">
              {t('recipes.detail.createdBy')} {recipe.created_by_profile?.full_name || t('common.unknownUser')} il{' '}
              {new Date(recipe.created_at).toLocaleDateString('it-IT')}
            </div>
          </CardContent>
        </Card>

        {/* Service Notes */}
        {recipe.recipe_service_notes && recipe.recipe_service_notes.length > 0 && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-warning" />
                Note di Servizio
              </h2>
              <div className="space-y-3">
                {recipe.recipe_service_notes.map((note: any) => (
                  <div key={note.id} className="p-4 bg-background rounded-lg border border-warning/30">
                    <p className="whitespace-pre-wrap">{note.note_text}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {note.created_by_profile?.full_name || 'Utente'} • {new Date(note.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingredients */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Ingredienti</h2>
            <div className="space-y-3">
              {recipe.recipe_ingredients.map((ing: any) => (
                <div key={ing.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-primary min-w-[80px]">
                    {ing.quantity} {ing.unit}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{ing.item_name_snapshot}</div>
                    {ing.notes && (
                      <div className="text-sm text-muted-foreground mt-1">💡 {ing.notes}</div>
                    )}
                    {ing.is_optional && (
                      <Badge variant="outline" className="text-xs mt-1">Opzionale</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">Procedimento</h2>
            <div className="space-y-6">
              {recipe.recipe_steps.map((step: any) => (
                <div key={step.id} className="relative pl-12">
                  <div className="absolute left-0 top-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                    {step.step_number}
                  </div>
                  
                  {step.photo_url && (
                    <Avatar className="h-48 w-full rounded-lg mb-3">
                      <AvatarImage src={step.photo_url} alt={step.title || `Step ${step.step_number}`} className="object-cover" />
                      <AvatarFallback className="rounded-lg">
                        <ChefHat className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {step.title && (
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  )}
                  
                  <p className="text-base leading-relaxed whitespace-pre-wrap mb-3">
                    {step.instruction}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {step.timer_minutes && step.timer_minutes > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {step.timer_minutes} min
                      </Badge>
                    )}
                    {step.checklist_items && step.checklist_items.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <ListChecks className="h-3 w-3" />
                        {step.checklist_items.length} items
                      </Badge>
                    )}
                  </div>

                  {step.checklist_items && step.checklist_items.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm">
                      {step.checklist_items.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-muted-foreground rounded" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
