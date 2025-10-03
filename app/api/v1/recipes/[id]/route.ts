import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

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
        recipe_ingredients(
          *,
          catalog_item:inventory_catalog_items(id, name, category, uom)
        ),
        recipe_steps(*),
        recipe_service_notes(
          *,
          created_by_profile:profiles(id, full_name)
        ),
        recipe_favorites!left(user_id)
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Increment view count
    await supabase
      .from('recipes')
      .update({ view_count: (recipe.view_count || 0) + 1 })
      .eq('id', params.id);

    // Add is_favorite flag
    const recipeWithFavorite = {
      ...recipe,
      is_favorite: recipe.recipe_favorites?.some((fav: any) => fav.user_id === user.id) || false
    };

    return NextResponse.json({ recipe: recipeWithFavorite });
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
    const {
      title,
      description,
      category,
      cuisine_type,
      servings,
      prep_time_minutes,
      cook_time_minutes,
      photo_url,
      allergens,
      season,
      tags
    } = body;

    // Check recipe status
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, created_by')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only update draft recipes' },
        { status: 400 }
      );
    }

    // Update recipe
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (cuisine_type !== undefined) updateData.cuisine_type = cuisine_type;
    if (servings !== undefined) updateData.servings = servings;
    if (prep_time_minutes !== undefined) updateData.prep_time_minutes = prep_time_minutes;
    if (cook_time_minutes !== undefined) updateData.cook_time_minutes = cook_time_minutes;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (allergens !== undefined) updateData.allergens = allergens;
    if (season !== undefined) updateData.season = season;
    if (tags !== undefined) updateData.tags = tags;

    const { data: recipe, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ recipe });
  } catch (error: any) {
    console.error('[recipes/:id/PATCH]', error);
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
      .select('status, created_by')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete draft recipes' },
        { status: 400 }
      );
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
