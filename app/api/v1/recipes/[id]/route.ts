import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { updateRecipeSchema } from '../schemas';

// GET /api/v1/recipes/:id - Get recipe detail
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        created_by_profile:profiles!recipes_created_by_fkey(id, full_name, avatar_url),
        submitted_by_profile:profiles!recipes_submitted_by_fkey(id, full_name),
        published_by_profile:profiles!recipes_published_by_fkey(id, full_name),
        location:locations(id, name),
        recipe_ingredients!recipe_ingredients_recipe_id_fkey(
          *,
          catalog_item:inventory_catalog_items(id, name, category, uom),
          sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey(id, title, servings, photo_url, status)
        ),
        recipe_steps(*),
        recipe_service_notes(
          *,
          created_by_profile:profiles!recipe_service_notes_created_by_fkey(id, full_name, avatar_url)
        ),
        recipe_favorites!left(user_id)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (error) throw error;

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Increment view count (fire and forget)
    supabase
      .from('recipes')
      .update({ view_count: (recipe.view_count || 0) + 1 })
      .eq('id', params.id)
      .then();

    // Add computed fields
    const recipeWithMeta = {
      ...recipe,
      is_favorite: recipe.recipe_favorites?.some((fav: any) => fav.user_id === user.id) || false,
      ingredient_count: recipe.recipe_ingredients?.length || 0,
      steps_count: recipe.recipe_steps?.length || 0,
      total_time_minutes: (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0),
      can_edit: recipe.status === 'draft' && (recipe.created_by === user.id || await canManageRecipe(supabase, recipe.org_id, recipe.location_id)),
      can_submit: recipe.status === 'draft' && recipe.created_by === user.id,
      can_publish: recipe.status === 'submitted' && await canManageRecipe(supabase, recipe.org_id, recipe.location_id),
      can_archive: (recipe.status === 'published' || recipe.status === 'submitted') && await canManageRecipe(supabase, recipe.org_id, recipe.location_id)
    };

    return NextResponse.json({ recipe: recipeWithMeta });
  } catch (error: any) {
    console.error('[recipes/:id/GET]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/recipes/:id - Update recipe (draft only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = updateRecipeSchema.parse(body);

    // Check recipe status
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, created_by, org_id, location_id')
      .eq('id', params.id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only update draft recipes' },
        { status: 400 }
      );
    }

    // Check permissions
    const canEdit = existingRecipe.created_by === user.id || 
                    await canManageRecipe(supabase, existingRecipe.org_id, existingRecipe.location_id);
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update recipe
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recipe });
  } catch (error: any) {
    console.error('[recipes/:id/PATCH]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/recipes/:id - Delete recipe (draft only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check recipe status
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, created_by, org_id, location_id')
      .eq('id', params.id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft recipes' },
        { status: 400 }
      );
    }

    // Check permissions
    const canDelete = existingRecipe.created_by === user.id || 
                      await canManageRecipe(supabase, existingRecipe.org_id, existingRecipe.location_id);
    
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[recipes/:id/DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}

// Helper: Check if user can manage recipes
async function canManageRecipe(supabase: any, orgId: string, locationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('user_can_manage_recipes', {
    p_org_id: orgId,
    p_location_id: locationId
  });
  
  if (error) {
    console.error('[canManageRecipe]', error);
    return false;
  }
  
  return data === true;
}
