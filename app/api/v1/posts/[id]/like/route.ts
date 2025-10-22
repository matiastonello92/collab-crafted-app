import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

/**
 * POST /api/v1/posts/[id]/like - Toggle like on a post
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check posts:like permission
    const { data: canLike } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:like'
    });
    if (!canLike) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ liked: false });
    } else {
      // Like
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
          org_id: profile.org_id,
        });

      if (insertError) throw insertError;

      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('POST /api/v1/posts/[id]/like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
