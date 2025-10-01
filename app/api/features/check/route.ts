import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const orgId = searchParams.get('org');

    if (!key || !orgId) {
      return NextResponse.json({ error: 'Missing key or org parameter' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('feature_enabled', { 
      p_org: orgId, 
      p_feature_key: key 
    });

    if (error) {
      console.error('Feature check error:', error);
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ enabled: !!data });
  } catch (error) {
    console.error('Feature check API error:', error);
    return NextResponse.json({ enabled: false });
  }
}