import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createRecipeSchema, recipesSearchSchema } from './schemas';

// GET /api/v1/recipes - List recipes with advanced search/filters
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate search params
    const params = recipesSearchSchema.parse({
      locationId: searchParams.get('locationId') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      cuisineType: searchParams.get('cuisineType') || undefined,
      search: searchParams.get('search') || undefined,
      includeItems: searchParams.get('includeItems')?.split(',').filter(Boolean) || undefined,
      excludeItems: searchParams.get('excludeItems')?.split(',').filter(Boolean) || undefined,
      allergens: searchParams.get('allergens')?.split(',').filter(Boolean) || undefined,
      season: searchParams.get('season') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      minServings: searchParams.get('minServings') ? parseInt(searchParams.get('minServings')!) : undefined,
      maxServings: searchParams.get('maxServings') ? parseInt(searchParams.get('maxServings')!) : undefined,
      maxPrepTime: searchParams.get('maxPrepTime') ? parseInt(searchParams.get('maxPrepTime')!) : undefined,
      maxCookTime: searchParams.get('maxCookTime') ? parseInt(searchParams.get('maxCookTime')!) : undefined,
      favoritesOnly: searchParams.get('favoritesOnly') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    });

    // Base query
    let query = supabase
      .from('recipes')
      .select(`
        *,
        created_by_profile:profiles!recipes_created_by_fkey(id, full_name, avatar_url),
        location:locations(id, name),
        recipe_ingredients!recipe_ingredients_recipe_id_fkey(
          id,
          quantity,
          unit,
          item_name_snapshot,
          is_optional,
          catalog_item:inventory_catalog_items(id, name, category)
        ),
        recipe_steps(id, step_number, title),
        recipe_favorites!left(user_id)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.locationId) {
      query = query.eq('location_id', params.locationId);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    } else {
      // Default: Base users see only published + own drafts
      // This is handled by RLS, but we can optimize the query
      query = query.or(`status.eq.published,created_by.eq.${user.id}`);
    }

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.cuisineType) {
      query = query.eq('cuisine_type', params.cuisineType);
    }

    if (params.season) {
      query = query.contains('season', [params.season]);
    }

    if (params.minServings) {
      query = query.gte('servings', params.minServings);
    }

    if (params.maxServings) {
      query = query.lte('servings', params.maxServings);
    }

    if (params.maxPrepTime) {
      query = query.lte('prep_time_minutes', params.maxPrepTime);
    }

    if (params.maxCookTime) {
      query = query.lte('cook_time_minutes', params.maxCookTime);
    }

    // Full-text search on title, description, tags
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      query = query.or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%`);
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      query = query.overlaps('tags', params.tags);
    }

    // Allergens filter
    if (params.allergens && params.allergens.length > 0) {
      query = query.overlaps('allergens', params.allergens);
    }

    // Pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: recipes, error, count } = await query;

    if (error) throw error;

    // Use RPC for item filtering if needed
    let filteredRecipes = recipes || [];
    
    if ((params.includeItems && params.includeItems.length > 0) || (params.excludeItems && params.excludeItems.length > 0)) {
      const { data: filteredIds, error: rpcError } = await supabase.rpc('search_recipes_by_items', {
        p_location_id: params.locationId,
        p_include_items: params.includeItems || null,
        p_exclude_items: params.excludeItems || null
      });

      if (rpcError) {
        console.error('RPC search_recipes_by_items error:', rpcError);
        return NextResponse.json({ error: 'Failed to filter recipes by items' }, { status: 500 });
      }

      const allowedIds = new Set((filteredIds || []).map((row: any) => row.recipe_id));
      filteredRecipes = filteredRecipes.filter((r: any) => allowedIds.has(r.id));
    }

    // Filter favorites only
    if (params.favoritesOnly) {
      filteredRecipes = filteredRecipes.filter((recipe: any) => 
        recipe.recipe_favorites?.some((fav: any) => fav.user_id === user.id)
      );
    }

    // Add is_favorite flag
    const recipesWithFavorites = filteredRecipes.map((recipe: any) => ({
      ...recipe,
      is_favorite: recipe.recipe_favorites?.some((fav: any) => fav.user_id === user.id) || false,
      ingredient_count: recipe.recipe_ingredients?.length || 0,
      steps_count: recipe.recipe_steps?.length || 0,
      total_time_minutes: (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)
    }));

    return NextResponse.json({ 
      recipes: recipesWithFavorites,
      pagination: {
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
        hasMore: (params.offset + params.limit) < (count || 0)
      }
    });
  } catch (error: any) {
    console.error('[recipes/GET]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// POST /api/v1/recipes - Create new recipe (draft)
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = createRecipeSchema.parse(body);

    const {
      org_id,
      location_id,
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
      tags,
      ingredients,
      steps
    } = validatedData;

    // Create recipe (draft)
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        org_id,
        location_id,
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
        tags,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientsData = ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        org_id,
        location_id,
        catalog_item_id: ing.catalog_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        item_name_snapshot: ing.item_name_snapshot,
        sort_order: ing.sort_order !== undefined ? ing.sort_order : idx,
        is_optional: ing.is_optional,
        notes: ing.notes
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) throw ingredientsError;
    }

    // Insert steps
    if (steps && steps.length > 0) {
      const stepsData = steps.map((step) => ({
        recipe_id: recipe.id,
        org_id,
        location_id,
        step_number: step.step_number,
        title: step.title,
        instruction: step.instruction,
        timer_minutes: step.timer_minutes,
        checklist_items: step.checklist_items,
        photo_url: step.photo_url
      }));

      const { error: stepsError } = await supabase
        .from('recipe_steps')
        .insert(stepsData);

      if (stepsError) throw stepsError;
    }

    // Fetch complete recipe
    const { data: completeRecipe } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients(*),
        recipe_steps(*)
      `)
      .eq('id', recipe.id)
      .single();

    return NextResponse.json({ recipe: completeRecipe || recipe }, { status: 201 });
  } catch (error: any) {
    console.error('[recipes/POST]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
