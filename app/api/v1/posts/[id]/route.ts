import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  media_urls: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
  })).optional(),
  mentioned_user_ids: z.array(z.string().uuid()).optional(),
});

/**
 * PATCH /api/v1/posts/[id] - Update post
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerActionClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify post exists and user is author
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const updateData = updatePostSchema.parse(body);

    // Update post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        ...(updateData.content !== undefined && { content: updateData.content }),
        ...(updateData.media_urls !== undefined && { media_urls: updateData.media_urls }),
        edited_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        content,
        media_urls,
        visibility,
        likes_count,
        comments_count,
        shares_count,
        is_pinned,
        created_at,
        edited_at,
        author:profiles!author_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    // Update mentions if provided
    if (updateData.mentioned_user_ids !== undefined) {
      // Delete existing mentions
      await supabase
        .from('post_mentions')
        .delete()
        .eq('post_id', id);

      // Insert new mentions
      if (updateData.mentioned_user_ids.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single();

        const mentions = updateData.mentioned_user_ids.map(userId => ({
          post_id: id,
          mentioned_user_id: userId,
          mentioned_org_id: null,
          org_id: profile?.org_id,
        }));

        await supabase.from('post_mentions').insert(mentions);
      }
    }

    return NextResponse.json({ post: updatedPost });

  } catch (error) {
    console.error('PATCH /api/v1/posts/[id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/posts/[id] - Delete post
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerActionClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, org_id')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check permissions: author or admin
    const isAuthor = post.author_id === user.id;
    
    if (!isAuthor) {
      // Check if user is admin
      const { data: permissions } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', post.org_id)
        .single();

      const isAdmin = permissions?.role === 'admin' || permissions?.role === 'super_admin';
      
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete post (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/v1/posts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
