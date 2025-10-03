import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/clone - Clone recipe as new draft
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch source recipe with all details
    const { data: sourceRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients(*),
        recipe_steps(*)
      `)
      .eq('id', params.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!sourceRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Create cloned recipe (as draft)
    const { data: newRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        org_id: sourceRecipe.org_id,
        location_id: sourceRecipe.location_id,
        title: `${sourceRecipe.title} (Copy)`,
        description: sourceRecipe.description,
        category: sourceRecipe.category,
        cuisine_type: sourceRecipe.cuisine_type,
        servings: sourceRecipe.servings,
        prep_time_minutes: sourceRecipe.prep_time_minutes,
        cook_time_minutes: sourceRecipe.cook_time_minutes,
        photo_url: sourceRecipe.photo_url,
        allergens: sourceRecipe.allergens,
        season: sourceRecipe.season,
        tags: sourceRecipe.tags,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Clone ingredients
    if (sourceRecipe.recipe_ingredients && sourceRecipe.recipe_ingredients.length > 0) {
      const ingredientsData = sourceRecipe.recipe_ingredients.map((ing: any) => ({
        recipe_id: newRecipe.id,
        org_id: newRecipe.org_id,
        location_id: newRecipe.location_id,
        catalog_item_id: ing.catalog_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        item_name_snapshot: ing.item_name_snapshot,
        sort_order: ing.sort_order,
        is_optional: ing.is_optional,
        notes: ing.notes
      }));

      await supabase.from('recipe_ingredients').insert(ingredientsData);
    }

    // Clone steps
    if (sourceRecipe.recipe_steps && sourceRecipe.recipe_steps.length > 0) {
      const stepsData = sourceRecipe.recipe_steps.map((step: any) => ({
        recipe_id: newRecipe.id,
        org_id: newRecipe.org_id,
        location_id: newRecipe.location_id,
        step_number: step.step_number,
        title: step.title,
        instruction: step.instruction,
        timer_minutes: step.timer_minutes,
        checklist_items: step.checklist_items,
        photo_url: step.photo_url
      }));

      await supabase.from('recipe_steps').insert(stepsData);
    }

    // Increment clone count on source recipe
    await supabase
      .from('recipes')
      .update({ clone_count: (sourceRecipe.clone_count || 0) + 1 })
      .eq('id', params.id);

    // Fetch complete cloned recipe
    const { data: completeRecipe } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients(*),
        recipe_steps(*)
      `)
      .eq('id', newRecipe.id)
      .single();

    return NextResponse.json({ 
      recipe: completeRecipe || newRecipe,
      message: `Recipe "${sourceRecipe.title}" cloned successfully`
    }, { status: 201 });
  } catch (error: any) {
    console.error('[recipes/:id/clone/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clone recipe' },
      { status: 500 }
    );
  }
}
