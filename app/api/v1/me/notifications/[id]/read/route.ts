import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark notification as read
    const { error: updateError } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Mark notification read error:', updateError);
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
