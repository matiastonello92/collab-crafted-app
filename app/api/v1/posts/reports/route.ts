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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch reports with post and reporter details
    let query = supabase
      .from('post_reports')
      .select(`
        *,
        post:posts!inner(
          id,
          content,
          author:profiles!posts_author_id_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error('Fetch reports error:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Get reporter details separately (not directly in join for security)
    const reporterIds = [...new Set(reports?.map(r => r.reported_by) || [])];
    const { data: reporters } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', reporterIds);

    const reportersMap = new Map(reporters?.map(r => [r.id, r]) || []);

    // Enrich reports with reporter info
    const enrichedReports = reports?.map(report => ({
      ...report,
      reporter: reportersMap.get(report.reported_by),
    }));

    return NextResponse.json({ 
      reports: enrichedReports || [],
      total: enrichedReports?.length || 0
    }, { status: 200 });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
