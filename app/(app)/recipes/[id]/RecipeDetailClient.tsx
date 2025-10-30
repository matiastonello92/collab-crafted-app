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
  Play,
  AlertCircle,
  Loader2,
  AlertTriangle as AlertTriangleIcon,
  Copy,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { IngredientsForm } from '../components/IngredientsForm';
import { RecipeWorkflowBadge } from '../components/RecipeWorkflowBadge';

import { StepsEditor } from '../components/StepsEditor';
import { getAllergenLabel, getAllergenColor } from '../constants/allergens';
import { formatSeasonRange, getSeasonColor } from '../constants/seasons';
import { FavoriteButton } from '../components/FavoriteButton';
import { CloneRecipeButton } from '../components/CloneRecipeButton';
import { ServiceNotesSection } from '../components/ServiceNotesSection';
import { PrintRecipeButton } from '../components/PrintRecipeButton';
import { formatTime } from '@/lib/recipes/scaling';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { CollaborationRequestDialog } from '../components/CollaborationRequestDialog';
import { CollaborationRequestsList } from '../components/CollaborationRequestsList';

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
  allergens?: string[];
  season?: string[];
  recipe_ingredients: any[];
  recipe_steps: any[];
  recipe_service_notes?: any[];
  profiles?: { full_name: string };
  created_by_profile?: { full_name: string; avatar_url?: string };
  is_favorite?: boolean;
  clone_count?: number;
  collaborator_ids?: string[];
}

interface RecipeDetailClientProps {
  recipeId: string;
}

export default function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  const [collaborationStatus, setCollaborationStatus] = useState<'none' | 'pending' | 'approved'>('none');

  useEffect(() => {
    loadRecipe();
    loadUserPermissions();
  }, [recipeId]);

  useEffect(() => {
    if (recipe && currentUserId) {
      checkCollaborationStatus();
    }
  }, [recipe, currentUserId]);

  async function loadRecipe() {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`);
      if (!response.ok) throw new Error('Failed to load recipe');
      
      const data = await response.json();
      console.log('Recipe loaded:', {
        status: data.recipe.status,
        can_edit: data.recipe.can_edit,
        can_publish: data.recipe.can_publish,
        created_by: data.recipe.created_by,
        currentUserId,
      });
      setRecipe(data.recipe);
    } catch (error) {
      console.error('Error loading recipe:', error);
      toast.error(t('recipes.detail.toast.loadError'));
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

  async function checkCollaborationStatus() {
    if (!recipe || !currentUserId || recipe.created_by === currentUserId) return;

    try {
      // Check if user is already a collaborator
      if (recipe.collaborator_ids?.includes(currentUserId)) {
        setCollaborationStatus('approved');
        return;
      }

      // Check if there's a pending request
      const response = await fetch(`/api/v1/recipes/${recipeId}/collaboration-requests`);
      const data = await response.json();
      
      const userRequest = data.requests?.find(
        (req: any) => req.requester_id === currentUserId && req.status === 'pending'
      );

      setCollaborationStatus(userRequest ? 'pending' : 'none');
    } catch (error) {
      console.error('Error checking collaboration status:', error);
    }
  }

  async function handleSubmit() {
    if (!recipe?.photo_url) {
      toast.error(t('recipes.detail.toast.submitNoPhoto'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/submit`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to submit');

      toast.success(t('recipes.detail.toast.submitSuccess'));
      loadRecipe();
    } catch (error) {
      toast.error(t('recipes.detail.toast.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!recipe?.photo_url) {
      toast.error(t('recipes.detail.toast.approveNoPhoto'));
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/publish`, {
        method: 'POST'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }

      toast.success(t('recipes.detail.toast.approveSuccess'));
      loadRecipe();
    } catch (error: any) {
      toast.error(error.message || t('recipes.detail.toast.approveError'));
    } finally {
      setIsApproving(false);
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
            <p>{t('recipes.detail.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = recipe.status === 'draft';
  const isSubmitted = recipe.status === 'submitted';
  const isPublished = recipe.status === 'published';
  const isOwner = currentUserId === recipe.created_by;
  const isCollaborator = recipe.collaborator_ids?.includes(currentUserId || '') || false;
  const canEdit = isDraft && (isOwner || isCollaborator || canManage);
  const canSubmit = isDraft && isOwner && recipe.photo_url;
  const canApprove = (isDraft || isSubmitted) && canManage && recipe.photo_url;
  const canUseCookMode = isPublished && recipe.recipe_steps?.length > 0;
  const canRequestCollaboration = isDraft && !isOwner && !isCollaborator && collaborationStatus === 'none';
  const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;

  console.log('Recipe permissions:', {
    isDraft,
    isOwner,
    canEdit,
    canManage,
    canApprove,
    currentUserId,
    createdBy: recipe.created_by,
  });

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Photo Required Warning for Draft */}
      {recipe.status === 'draft' && !recipe.photo_url && (
        <Alert variant="default" className="border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>{t('recipes.detail.photoRequiredDraft')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Photo Required Warning for Submitted */}
      {recipe.status === 'submitted' && !recipe.photo_url && canManage && (
        <Alert variant="default" className="border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>{t('recipes.detail.photoMissingSubmitted')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('recipes.detail.back')}
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <RecipeWorkflowBadge status={recipe.status as any} />
          
          <FavoriteButton 
            recipeId={recipeId} 
            initialIsFavorite={recipe.is_favorite}
            variant="icon"
          />

          {recipe.clone_count && recipe.clone_count > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Copy className="w-3 h-3" />
              {t('recipes.detail.cloned')} {recipe.clone_count}x
            </Badge>
          )}

          {isCollaborator && (
            <Badge variant="default" className="gap-1 bg-blue-600">
              <Users className="w-3 h-3" />
              Collaboratore
            </Badge>
          )}

          {collaborationStatus === 'pending' && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              Richiesta Inviata
            </Badge>
          )}

          {isDraft && recipe.collaborator_ids && recipe.collaborator_ids.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {recipe.collaborator_ids.length} Collaboratori
            </Badge>
          )}
          
          {canUseCookMode && (
            <Button
              variant="default"
              onClick={() => router.push(`/recipes/${recipeId}/cook`)}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {t('recipes.detail.cookMode')}
            </Button>
          )}

          {isPublished && (
            <CloneRecipeButton 
              recipeId={recipeId}
              recipeTitle={recipe.title}
            />
          )}
          
          {(isPublished || isSubmitted) && (
            <PrintRecipeButton 
              recipeId={recipeId}
              defaultServings={recipe.servings}
            />
          )}

          {canRequestCollaboration && (
            <Button
              variant="outline"
              onClick={() => setShowCollaborationDialog(true)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Richiedi Collaborazione
            </Button>
          )}
          
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => router.push(`/recipes/${recipeId}/edit`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              {t('recipes.detail.editDraft')}
            </Button>
          )}
          
          {isDraft && isOwner && (
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={isSubmitting || !recipe.photo_url}
              className="gap-2"
              title={!recipe.photo_url ? t('recipes.detail.uploadPhotoTooltip') : undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('recipes.detail.submitting')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t('recipes.detail.submitForApproval')}
                </>
              )}
            </Button>
          )}
          
          {canManage && (isDraft || isSubmitted) && (
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={isApproving || !recipe.photo_url}
              className="gap-2 bg-green-600 hover:bg-green-700"
              title={!recipe.photo_url ? t('recipes.detail.photoRequiredToPublish') : undefined}
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('recipes.detail.approving')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t('recipes.detail.approveAndPublish')}
                </>
              )}
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
                <Badge variant="secondary">{t(`categories.${recipe.category}`)}</Badge>
                
                 {/* Allergen Badges */}
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

                {/* Season Badge */}
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

              <Separator />

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

              <Separator />

              <div className="text-sm text-muted-foreground">
                {t('recipes.detail.createdBy')} {recipe.created_by_profile?.full_name || recipe.profiles?.full_name || t('common.unknownUser')} il{' '}
                {new Date(recipe.created_at).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
        <Tabs defaultValue="ingredients" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ingredients">{t('recipes.detail.ingredients')}</TabsTrigger>
          <TabsTrigger value="steps">{t('recipes.detail.steps')}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            {t('recipes.detail.serviceNotes')}
            {recipe.recipe_service_notes && recipe.recipe_service_notes.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {recipe.recipe_service_notes.length}
              </Badge>
            )}
          </TabsTrigger>
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

        <TabsContent value="notes" className="mt-6">
          <ServiceNotesSection
            recipeId={recipeId}
            notes={recipe.recipe_service_notes || []}
            onNoteAdded={(note) => {
              setRecipe({
                ...recipe,
                recipe_service_notes: [note, ...(recipe.recipe_service_notes || [])]
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Collaboration Requests Management (for owners/admins) */}
      {isDraft && (isOwner || canManage) && (
        <div className="mt-6">
          <CollaborationRequestsList 
            recipeId={recipeId}
            canManage={isOwner || canManage}
          />
        </div>
      )}

      {/* Collaboration Request Dialog */}
      <CollaborationRequestDialog
        recipeId={recipeId}
        recipeTitle={recipe.title}
        isOpen={showCollaborationDialog}
        onClose={() => setShowCollaborationDialog(false)}
        onSuccess={() => {
          checkCollaborationStatus();
          loadRecipe();
        }}
      />

    </div>
  );
}
