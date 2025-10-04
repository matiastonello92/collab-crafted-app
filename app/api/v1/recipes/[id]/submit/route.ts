import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/submit - Submit recipe for approval (draft → submitted)
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

    // Check recipe status and validation
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select(`
        status, created_by, title, servings,
        recipe_ingredients(id, quantity),
        recipe_steps(id, instruction)
      `)
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot submit recipe with status: ${existingRecipe.status}` },
        { status: 400 }
      );
    }

    // P1: Server-side validation
    if (!existingRecipe.servings || existingRecipe.servings < 1) {
      return NextResponse.json(
        { error: 'Servings must be at least 1' },
        { status: 400 }
      );
    }

    const ingredients = existingRecipe.recipe_ingredients || [];
    if (ingredients.length === 0 || !ingredients.some((ing: any) => ing.quantity > 0)) {
      return NextResponse.json(
        { error: 'Recipe must have at least one ingredient with quantity > 0' },
        { status: 400 }
      );
    }

    const steps = existingRecipe.recipe_steps || [];
    if (steps.length === 0 || !steps.some((step: any) => step.instruction?.trim())) {
      return NextResponse.json(
        { error: 'Recipe must have at least one step with instructions' },
        { status: 400 }
      );
    }

    // Transition: draft → submitted
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update({
        status: 'submitted',
        submitted_by: user.id,
        submitted_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      recipe,
      message: `Recipe "${existingRecipe.title}" submitted for approval`
    });
  } catch (error: any) {
    console.error('[recipes/:id/submit/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit recipe' },
      { status: 500 }
    );
  }
}
