import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const locationId = searchParams.get('locationId');

    if (query.length < 2) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // Build query for users in same org
    let usersQuery = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, org_id')
      .eq('org_id', profile.org_id)
      .ilike('full_name', `%${query}%`)
      .neq('id', user.id)
      .limit(10);

    // Optional: filter by location
    if (locationId) {
      usersQuery = usersQuery.eq('default_location_id', locationId);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error('User search error:', usersError);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      users: users || [],
      total: users?.length || 0 
    }, { status: 200 });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
