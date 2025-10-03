'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ChefHat, 
  Clock, 
  Users, 
  Edit, 
  CheckCircle2,
  Send,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { IngredientsForm } from '../components/IngredientsForm';
import { RecipeWorkflowBadge } from '../components/RecipeWorkflowBadge';
import { RecipeEditorDialog } from '../components/RecipeEditorDialog';
import { StepsEditor } from '../components/StepsEditor';
import { formatTime } from '@/lib/recipes/scaling';

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
  created_by: string;
  created_at: string;
  recipe_ingredients: any[];
  recipe_steps: any[];
  profiles?: { full_name: string };
}

interface RecipeDetailClientProps {
  recipeId: string;
}

export default function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    loadRecipe();
    loadUserPermissions();
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Failed to load recipe');
      
      const data = await response.json();
      setRecipe(data.recipe);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast.error('Errore caricamento ricetta');
    } finally {
      setLoading(false);
    }
  }

  async function loadUserPermissions() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        // Check if user can manage recipes
        const { data: profile } = await supabase
          .from('profiles')
          .select('can_publish')
          .eq('id', user.id)
          .single();

        setCanManage(profile?.can_publish || false);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }

  async function handleSubmit() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/submit`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to submit');

      toast.success('Ricetta inviata per approvazione');
      loadRecipe();
    } catch (error) {
      toast.error('Errore invio ricetta');
    }
  }

  async function handleApprove() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/approve`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }

      toast.success('Ricetta approvata e pubblicata');
      loadRecipe();
    } catch (error: any) {
      toast.error(error.message || 'Errore approvazione ricetta');
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Ricetta non trovata</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = recipe.status === 'draft';
  const isSubmitted = recipe.status === 'submitted';
  const isPublished = recipe.status === 'published';
  const isOwner = currentUserId === recipe.created_by;
  const canEdit = isDraft && isOwner;
  const canSubmit = isDraft && isOwner && recipe.photo_url;
  const canApprove = (isDraft || isSubmitted) && canManage && recipe.photo_url;
  const canUseCookMode = isPublished && recipe.recipe_steps?.length > 0;
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Button>

        <div className="flex items-center gap-2">
          <RecipeWorkflowBadge status={recipe.status as any} />
          
          {canUseCookMode && (
            <Button
              variant="default"
              onClick={() => router.push(`/recipes/${recipeId}/cook`)}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Modalità Cucina
            </Button>
          )}
          
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => setEditorOpen(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifica
            </Button>
          )}
          
          {canSubmit && (
            <Button
              variant="default"
              onClick={handleSubmit}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Invia per Approvazione
            </Button>
          )}
          
          {canApprove && (
            <Button
              variant="default"
              onClick={handleApprove}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approva e Pubblica
            </Button>
          )}
        </div>
      </div>

      {/* Recipe Header */}
      <Card>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {recipe.photo_url ? (
              <Avatar className="h-[300px] w-full rounded-lg">
                <AvatarImage src={recipe.photo_url} alt={recipe.title} className="object-cover" />
                <AvatarFallback className="rounded-lg">
                  <ChefHat className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-[300px] w-full bg-muted rounded-lg flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
                {recipe.description && (
                  <p className="text-muted-foreground">{recipe.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{recipe.category}</Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Porzioni</p>
                    <p className="font-medium">{recipe.servings}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Preparazione</p>
                    <p className="font-medium">{formatTime(recipe.prep_time_minutes)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Totale</p>
                    <p className="font-medium">{formatTime(totalTime)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                Creata da {recipe.profiles?.full_name || 'Utente'} il{' '}
                {new Date(recipe.created_at).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="ingredients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ingredients">Ingredienti</TabsTrigger>
          <TabsTrigger value="steps">Procedimento</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-4">
          <IngredientsForm
            ingredients={recipe.recipe_ingredients || []}
            onIngredientsChange={() => {}}
            readOnly={true}
            currentRecipeId={recipe.id}
          />
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          <StepsEditor
            recipeId={recipe.id}
            steps={recipe.recipe_steps || []}
            readOnly={!canEdit}
            onStepsChange={loadRecipe}
          />
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <RecipeEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSuccess={() => {
          setEditorOpen(false);
          loadRecipe();
        }}
      />
    </div>
  );
}
