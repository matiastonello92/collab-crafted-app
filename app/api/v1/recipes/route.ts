import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/v1/recipes - List recipes
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let query = supabase
      .from('recipes')
      .select(`
        *,
        created_by_profile:profiles!recipes_created_by_fkey(id, full_name),
        location:locations(id, name),
        recipe_ingredients(
          id,
          quantity,
          unit,
          item_name_snapshot,
          catalog_item:inventory_catalog_items(id, name)
        ),
        recipe_steps(id, step_number, title),
        recipe_favorites!left(user_id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: recipes, error } = await query;

    if (error) throw error;

    // Add is_favorite flag
    const recipesWithFavorites = recipes?.map((recipe: any) => ({
      ...recipe,
      is_favorite: recipe.recipe_favorites?.some((fav: any) => fav.user_id === user.id) || false
    }));

    return NextResponse.json({ recipes: recipesWithFavorites || [] });
  } catch (error: any) {
    console.error('[recipes/GET]', error);
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
      ingredients, // array di { catalog_item_id, quantity, unit, item_name_snapshot }
      steps // array di { step_number, title, instruction, timer_minutes, checklist_items }
    } = body;

    // Validation
    if (!org_id || !location_id || !title || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, location_id, title, category' },
        { status: 400 }
      );
    }

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
        servings: servings || 4,
        prep_time_minutes: prep_time_minutes || 0,
        cook_time_minutes: cook_time_minutes || 0,
        photo_url,
        allergens: allergens || [],
        season: season || [],
        tags: tags || [],
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientsData = ingredients.map((ing: any, idx: number) => ({
        recipe_id: recipe.id,
        org_id,
        location_id,
        catalog_item_id: ing.catalog_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        item_name_snapshot: ing.item_name_snapshot,
        sort_order: idx,
        is_optional: ing.is_optional || false,
        notes: ing.notes
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) throw ingredientsError;
    }

    // Insert steps
    if (steps && steps.length > 0) {
      const stepsData = steps.map((step: any) => ({
        recipe_id: recipe.id,
        org_id,
        location_id,
        step_number: step.step_number,
        title: step.title,
        instruction: step.instruction,
        timer_minutes: step.timer_minutes,
        checklist_items: step.checklist_items || [],
        photo_url: step.photo_url
      }));

      const { error: stepsError } = await supabase
        .from('recipe_steps')
        .insert(stepsData);

      if (stepsError) throw stepsError;
    }

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error: any) {
    console.error('[recipes/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
