'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, Users, ChefHat, Archive, Send, Trash2, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { RecipeEditorDialog } from './components/RecipeEditorDialog';
import { RecipeWorkflowBadge } from './components/RecipeWorkflowBadge';
import { RecipeFilters, RecipeFiltersState } from './components/RecipeFilters';
import { FavoriteButton } from './components/FavoriteButton';
import { Badge } from '@/components/ui/badge';
import { getAllergenColor, getAllergenLabel } from './constants/allergens';
import { AlertTriangle } from 'lucide-react';

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
  allergens?: string[];
  created_by_profile: {
    full_name: string;
  };
}

export function RecipesClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [defaultLocationId, setDefaultLocationId] = useState<string>('');
  const [itemNames, setItemNames] = useState<Map<string, string>>(new Map());
  const [filters, setFilters] = useState<RecipeFiltersState>({
    q: '',
    status: 'all',
    category: 'all',
    includeItems: [],
    excludeItems: [],
    allergens: [],
    favorites: false,
    sortBy: 'recent',
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (defaultLocationId) {
      loadRecipes();
      loadItemNames();
    }
  }, [filters, defaultLocationId]);

  async function loadUser() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_location_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.default_location_id) {
        setDefaultLocationId(profile.default_location_id);
      }
    }
  }

  async function loadRecipes() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set('search', filters.q);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.includeItems.length > 0) params.set('includeItems', filters.includeItems.join(','));
      if (filters.excludeItems.length > 0) params.set('excludeItems', filters.excludeItems.join(','));
      if (filters.allergens && filters.allergens.length > 0) params.set('allergens', filters.allergens.join(','));
      if (filters.favorites) params.set('favorites', 'true');
      if (filters.sortBy && filters.sortBy !== 'recent') params.set('sortBy', filters.sortBy);
      if (defaultLocationId) params.set('locationId', defaultLocationId);

      const response = await fetch(`/api/v1/recipes?${params.toString()}`);
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

  async function loadItemNames() {
    if (!defaultLocationId) return;
    try {
      const response = await fetch(`/api/v1/inventory/catalog?locationId=${defaultLocationId}`);
      if (response.ok) {
        const data = await response.json();
        const names = new Map<string, string>(
          (data.items || []).map((item: any) => [item.id as string, item.name as string])
        );
        setItemNames(names);
      }
    } catch (error) {
      console.error('Failed to load item names:', error);
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
      
      toast.success('Ricetta inviata per approvazione');
      loadRecipes();
    } catch (error: any) {
      toast.error('Errore invio ricetta', {
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
          <p className="text-muted-foreground">
            {recipes.length} {recipes.length === 1 ? 'ricetta trovata' : 'ricette trovate'}
          </p>
        </div>
        <Button onClick={() => setEditorOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuova Ricetta
        </Button>
      </div>

      {defaultLocationId && (
        <RecipeFilters
          filters={filters}
          onFiltersChange={setFilters}
          locationId={defaultLocationId}
          itemNames={itemNames}
        />
      )}

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
                    <div className="flex items-center justify-between mb-2">
                      <RecipeWorkflowBadge status={recipe.status} />
                      <div className="flex items-center gap-1">
                        <FavoriteButton 
                          recipeId={recipe.id}
                          initialIsFavorite={(recipe as any).is_favorite}
                          variant="icon"
                          size="sm"
                        />
                        <Link href={`/recipes/${recipe.id}`} passHref>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">{recipe.title}</h3>
                    
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

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {recipe.category}
                    </Badge>
                    
                    {/* Allergen badges (max 3 + count) */}
                    {recipe.allergens && recipe.allergens.length > 0 && (
                      <>
                        {recipe.allergens.slice(0, 3).map((allergenKey: string) => {
                          const color = getAllergenColor(allergenKey);
                          const label = getAllergenLabel(allergenKey);
                          return (
                            <Badge
                              key={allergenKey}
                              variant="secondary"
                              className="text-xs gap-1"
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
                        {recipe.allergens.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{recipe.allergens.length - 3}
                          </Badge>
                        )}
                      </>
                    )}
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
                        disabled={!recipe.photo_url}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Invia
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

                    {!recipe.photo_url && recipe.status === 'draft' && (
                      <div className="w-full text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                        ⚠️ Foto obbligatoria per inviare
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
