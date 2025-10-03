import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/archive - Archive recipe (any → archived)
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

    // Check recipe
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, title, org_id, location_id')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    // Verify user has permission to archive (Manager/Org Admin)
    const { data: canManage } = await supabase.rpc('user_can_manage_recipes', {
      p_org_id: existingRecipe.org_id,
      p_location_id: existingRecipe.location_id
    });

    if (!canManage) {
      return NextResponse.json(
        { error: 'Only Manager or Org Admin can archive recipes' },
        { status: 403 }
      );
    }

    if (existingRecipe.status === 'archived') {
      return NextResponse.json(
        { error: 'Recipe is already archived' },
        { status: 400 }
      );
    }

    // Transition: any → archived
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update({
        status: 'archived',
        archived_by: user.id,
        archived_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      recipe,
      message: `Recipe "${existingRecipe.title}" has been archived`
    });
  } catch (error: any) {
    console.error('[recipes/:id/archive/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to archive recipe' },
      { status: 500 }
    );
  }
}
