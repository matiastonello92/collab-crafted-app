import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/v1/recipes/:id/favorite - Toggle favorite
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

    // Check if already favorited
    const { data: existing } = await supabase
      .from('recipe_favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('recipe_id', params.id)
      .maybeSingle();

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('recipe_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', params.id);

      if (error) throw error;

      return NextResponse.json({ is_favorite: false });
    } else {
      // Add favorite
      const { error } = await supabase
        .from('recipe_favorites')
        .insert({
          user_id: user.id,
          recipe_id: params.id
        });

      if (error) throw error;

      return NextResponse.json({ is_favorite: true });
    }
  } catch (error: any) {
    console.error('[recipes/:id/favorite/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/recipes/:id/favorite - Remove favorite (explicit)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('recipe_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', params.id);

    if (error) throw error;

    return NextResponse.json({ is_favorite: false });
  } catch (error: any) {
    console.error('[recipes/:id/favorite/DELETE]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
