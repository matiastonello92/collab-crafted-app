import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createIngredientSchema, updateIngredientSchema } from '../../schemas';

// POST /api/v1/recipes/:id/ingredients - Add ingredient to recipe
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

    // Check recipe exists and is draft
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('status, org_id, location_id, created_by')
      .eq('id', params.id)
      .maybeSingle();

    if (recipeError) throw recipeError;
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (recipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only add ingredients to draft recipes' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createIngredientSchema.parse(body);

    const { data: ingredient, error } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id: params.id,
        org_id: recipe.org_id,
        location_id: recipe.location_id,
        ...validatedData
      })
      .select(`
        *,
        catalog_item:inventory_catalog_items(id, name, category, uom)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (error: any) {
    console.error('[recipes/:id/ingredients/POST]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add ingredient' },
      { status: 500 }
    );
  }
}
