import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_comment_id: z.string().uuid().optional(),
});

/**
 * GET /api/v1/posts/[id]/comments - Fetch comments for a post
 */
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

    // Check posts:view permission
    const { data: canView } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:view'
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        parent_comment_id,
        likes_count,
        is_edited,
        created_at,
        edited_at,
        author:profiles!author_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('GET /api/v1/posts/[id]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/posts/[id]/comments - Create a comment
 */
export async function POST(
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

    // Check posts:comment permission
    const { data: canComment } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:comment'
    });
    if (!canComment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const commentData = createCommentSchema.parse(body);

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: comment, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        org_id: profile.org_id,
        content: commentData.content,
        parent_comment_id: commentData.parent_comment_id || null,
      })
      .select(`
        id,
        content,
        parent_comment_id,
        likes_count,
        is_edited,
        created_at,
        author:profiles!author_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/posts/[id]/comments error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
