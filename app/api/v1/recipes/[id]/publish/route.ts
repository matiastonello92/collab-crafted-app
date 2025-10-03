import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/publish - Publish recipe (submitted → published)
// REQUIRES: photo_url must be set (foto obbligatoria per pubblicare)
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

    // Check recipe status and photo
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('status, photo_url, title, org_id, location_id')
      .eq('id', params.id)
      .single();

    if (checkError) throw checkError;

    // Verify user has permission to publish (Manager/Org Admin)
    const { data: canManage } = await supabase.rpc('user_can_manage_recipes', {
      p_org_id: existingRecipe.org_id,
      p_location_id: existingRecipe.location_id
    });

    if (!canManage) {
      return NextResponse.json(
        { error: 'Only Manager or Org Admin can publish recipes' },
        { status: 403 }
      );
    }

    if (existingRecipe.status !== 'submitted') {
      return NextResponse.json(
        { error: `Cannot publish recipe with status: ${existingRecipe.status}` },
        { status: 400 }
      );
    }

    // CRITICAL CHECK: photo_url must be set to publish
    if (!existingRecipe.photo_url || existingRecipe.photo_url.trim() === '') {
      return NextResponse.json(
        { error: 'Cannot publish recipe without a photo. Please upload a photo first.' },
        { status: 400 }
      );
    }

    // Transition: submitted → published
    const { data: recipe, error } = await supabase
      .from('recipes')
      .update({
        status: 'published',
        published_by: user.id,
        published_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      recipe,
      message: `Recipe "${existingRecipe.title}" has been published`
    });
  } catch (error: any) {
    console.error('[recipes/:id/publish/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to publish recipe' },
      { status: 500 }
    );
  }
}
