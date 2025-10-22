import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

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

    const { status, notes } = await request.json();

    if (!status || !['reviewed', 'dismissed', 'actioned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update report
    const { data: report, error: updateError } = await supabase
      .from('post_reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes?.trim() || null,
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      console.error('Update report error:', updateError);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error('Review report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
