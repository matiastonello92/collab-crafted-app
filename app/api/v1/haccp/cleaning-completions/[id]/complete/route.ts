import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { checklist_responses, photo_urls, notes, completion_type, partial_completion_reason } = body;

    // Permission check
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate partial completion
    if (completion_type === 'partial' && !partial_completion_reason) {
      return NextResponse.json({ error: 'Partial completion reason is required' }, { status: 400 });
    }

    // Update completion
    const { data: completion, error } = await supabase
      .from('haccp_cleaning_completions')
      .update({
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        status: 'completed',
        checklist_responses: checklist_responses || {},
        photo_urls: photo_urls || [],
        notes: notes || null,
        completion_type: completion_type || 'full',
        partial_completion_reason: partial_completion_reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error completing cleaning:', error);
      return NextResponse.json({ error: 'Failed to complete cleaning' }, { status: 500 });
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Error in POST complete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
