import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:check'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { skip_reason } = body;

    if (!skip_reason || skip_reason.trim().length < 10) {
      return NextResponse.json({ error: 'Skip reason required (min 10 characters)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('haccp_tasks')
      .update({
        status: 'skipped',
        skip_reason,
        skipped_at: new Date().toISOString(),
        skipped_by: user.id
      })
      .eq('id', params.taskId)
      .select()
      .single();

    if (error) {
      console.error('Error skipping task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
