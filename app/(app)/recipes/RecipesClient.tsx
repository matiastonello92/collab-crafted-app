'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, Users, ChefHat, Archive, Send, CheckCircle, Trash2, Plus } from 'lucide-react';
import { RecipeEditorDialog } from './components/RecipeEditorDialog';

interface Recipe {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'submitted' | 'published' | 'archived';
  photo_url: string | null;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  created_by: string;
  created_at: string;
  created_by_profile: {
    full_name: string;
  };
}

const STATUS_COLORS = {
  draft: 'bg-gray-500',
  submitted: 'bg-yellow-500',
  published: 'bg-green-500',
  archived: 'bg-gray-400'
};

const STATUS_LABELS = {
  draft: 'Bozza',
  submitted: 'In Approvazione',
  published: 'Pubblicata',
  archived: 'Archiviata'
};

export function RecipesClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    loadRecipes();
    loadUser();
  }, []);

  async function loadUser() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  }

  async function loadRecipes() {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/recipes');
      if (!response.ok) throw new Error('Failed to load recipes');
      
      const data = await response.json();
      setRecipes(data.recipes || []);
    } catch (error: any) {
      toast.error('Errore caricamento ricette', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(recipeId: string) {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/submit`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit');
      }
      
      const data = await response.json();
      toast.success('Ricetta inviata per approvazione');
      loadRecipes();
    } catch (error: any) {
      toast.error('Errore invio ricetta', {
        description: error.message
      });
    }
  }

  async function handlePublish(recipeId: string) {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/publish`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish');
      }
      
      const data = await response.json();
      toast.success('Ricetta pubblicata');
      loadRecipes();
    } catch (error: any) {
      toast.error('Errore pubblicazione', {
        description: error.message
      });
    }
  }

  async function handleArchive(recipeId: string) {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/archive`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive');
      }
      
      toast.success('Ricetta archiviata');
      loadRecipes();
    } catch (error: any) {
      toast.error('Errore archiviazione', {
        description: error.message
      });
    }
  }

  async function handleDelete(recipeId: string) {
    if (!confirm('Eliminare questa bozza?')) return;
    
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      toast.success('Ricetta eliminata');
      loadRecipes();
    } catch (error: any) {
      toast.error('Errore eliminazione', {
        description: error.message
      });
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Klyra Recipes</h1>
          <p className="text-muted-foreground">Gestione ricette con workflow approvativo</p>
        </div>
        <Button onClick={() => setEditorOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuova Ricetta
        </Button>
      </div>

      <RecipeEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSuccess={loadRecipes}
      />

      {recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <ChefHat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nessuna ricetta</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Inizia creando la tua prima ricetta
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => {
            const isOwner = recipe.created_by === userId;
            const canSubmit = isOwner && recipe.status === 'draft';
            const canPublish = recipe.status === 'submitted';
            const canArchive = recipe.status === 'published';
            const canDelete = isOwner && recipe.status === 'draft';

            return (
              <Card key={recipe.id} className="overflow-hidden">
                {recipe.photo_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img 
                      src={recipe.photo_url} 
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{recipe.title}</h3>
                      <Badge className={STATUS_COLORS[recipe.status]}>
                        {STATUS_LABELS[recipe.status]}
                      </Badge>
                    </div>
                    
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{recipe.servings}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{recipe.prep_time_minutes + recipe.cook_time_minutes}min</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Creata da {recipe.created_by_profile?.full_name || 'N/A'}
                  </div>

                  {/* Workflow Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {canSubmit && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(recipe.id)}
                        className="flex-1"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Invia per approvazione
                      </Button>
                    )}

                    {canPublish && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(recipe.id)}
                        variant={recipe.photo_url ? "default" : "secondary"}
                        disabled={!recipe.photo_url}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Pubblica
                      </Button>
                    )}

                    {canArchive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(recipe.id)}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archivia
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Elimina
                      </Button>
                    )}

                    {!recipe.photo_url && recipe.status === 'submitted' && (
                      <div className="w-full text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                        ⚠️ Foto obbligatoria per pubblicare
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
