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

    // Check if user can view posts
    const { data: canView } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:view'
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check rate limit
    const { data: canReport } = await supabase.rpc('can_report_post', {
      p_user_id: user.id,
      p_post_id: postId,
    });

    if (!canReport) {
      return NextResponse.json({ 
        error: 'You have already reported this post or exceeded the rate limit' 
      }, { status: 429 });
    }

    const { reason, details } = await request.json();

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // Create report
    const { data: report, error: reportError } = await supabase
      .from('post_reports')
      .insert({
        post_id: postId,
        reported_by: user.id,
        reason: reason.trim(),
        details: details?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report creation error:', reportError);
      return NextResponse.json({ error: 'Failed to report post' }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Report post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
