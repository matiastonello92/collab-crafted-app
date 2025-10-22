import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
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

    // Track view (fire and forget - don't wait for response)
    supabase
      .from('post_analytics')
      .insert({
        post_id: postId,
        user_id: user.id,
        event_type: 'view',
      })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to track view:', error);
        }
      });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
