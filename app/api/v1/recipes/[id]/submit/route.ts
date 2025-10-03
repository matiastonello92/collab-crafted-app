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

    // Check recipe status
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, created_by, title')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    if (existingRecipe.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot submit recipe with status: ${existingRecipe.status}` },
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
