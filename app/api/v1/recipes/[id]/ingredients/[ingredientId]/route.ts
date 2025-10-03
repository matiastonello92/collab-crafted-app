import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { updateIngredientSchema } from '../../../schemas';

// PATCH /api/v1/recipes/:id/ingredients/:ingredientId - Update ingredient
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; ingredientId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check recipe is draft
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('status')
      .eq('id', params.id)
      .maybeSingle();

    if (recipeError) throw recipeError;
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only update ingredients in draft recipes' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    const { data: ingredient, error } = await supabase
      .from('recipe_ingredients')
      .update(validatedData)
      .eq('id', params.ingredientId)
      .eq('recipe_id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ingredient });
  } catch (error: any) {
    console.error('[recipes/:id/ingredients/:ingredientId/PATCH]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/recipes/:id/ingredients/:ingredientId - Remove ingredient
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; ingredientId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check recipe is draft
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('status')
      .eq('id', params.id)
      .maybeSingle();

    if (recipeError) throw recipeError;
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only remove ingredients from draft recipes' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', params.ingredientId)
      .eq('recipe_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[recipes/:id/ingredients/:ingredientId/DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove ingredient' },
      { status: 500 }
    );
  }
}
