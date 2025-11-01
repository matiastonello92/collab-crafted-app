import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { updateStepSchema } from '../../../schemas';

// PATCH /api/v1/recipes/:id/steps/:stepId - Update step
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
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
        { error: 'Can only update steps in draft recipes' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateStepSchema.parse(body);

  const { data: step, error } = await supabase
    .from('recipe_steps')
    .update(validatedData)
    .eq('id', params.stepId)
    .eq('recipe_id', params.id)
    .select()
    .maybeSingle();

  if (error) throw error;
  
  if (!step) {
    return NextResponse.json(
      { error: 'Step not found or does not belong to this recipe' },
      { status: 404 }
    );
  }

    return NextResponse.json({ step });
  } catch (error: any) {
    console.error('[recipes/:id/steps/:stepId/PATCH]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update step' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/recipes/:id/steps/:stepId - Remove step
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; stepId: string } }
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
        { error: 'Can only remove steps from draft recipes' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('recipe_steps')
      .delete()
      .eq('id', params.stepId)
      .eq('recipe_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[recipes/:id/steps/:stepId/DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove step' },
      { status: 500 }
    );
  }
}
