import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createSupabaseServerActionClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is post author or moderator
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isAuthor = post.author_id === user.id;
    const { data: canModerate } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:moderate'
    });

    if (!isAuthor && !canModerate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get stats using database function
    const { data: stats, error: statsError } = await supabase.rpc('get_post_stats', {
      p_post_id: postId,
    });

    if (statsError) {
      console.error('Get stats error:', statsError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Post stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
