import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

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

    // Check moderation permission
    const { data: canModerate } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:moderate'
    });
    if (!canModerate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reason } = await request.json();

    // Hide post
    const { error: updateError } = await supabase
      .from('posts')
      .update({ is_hidden: true })
      .eq('id', postId);

    if (updateError) {
      console.error('Hide post error:', updateError);
      return NextResponse.json({ error: 'Failed to hide post' }, { status: 500 });
    }

    // Track who hid it and why
    const { error: trackError } = await supabase
      .from('hidden_posts')
      .insert({
        post_id: postId,
        hidden_by: user.id,
        reason: reason?.trim() || null,
      });

    if (trackError) {
      console.error('Track hidden post error:', trackError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Hide post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Check moderation permission
    const { data: canModerate } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:moderate'
    });
    if (!canModerate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Unhide post
    const { error: updateError } = await supabase
      .from('posts')
      .update({ is_hidden: false })
      .eq('id', postId);

    if (updateError) {
      console.error('Unhide post error:', updateError);
      return NextResponse.json({ error: 'Failed to unhide post' }, { status: 500 });
    }

    // Track who unhid it
    const { error: trackError } = await supabase
      .from('hidden_posts')
      .update({
        unhidden_by: user.id,
        unhidden_at: new Date().toISOString(),
      })
      .eq('post_id', postId);

    if (trackError) {
      console.error('Track unhidden post error:', trackError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unhide post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
