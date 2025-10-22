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

    const { data: canView } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:view'
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Query trending posts from materialized view
    let query = supabase
      .from('post_engagement_stats')
      .select(`
        id,
        engagement_score,
        views_count,
        hours_old
      `)
      .order('engagement_score', { ascending: false })
      .limit(limit);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: trendingStats, error: statsError } = await query;

    if (statsError) {
      console.error('Trending stats error:', statsError);
      return NextResponse.json({ error: 'Failed to fetch trending posts' }, { status: 500 });
    }

    if (!trendingStats || trendingStats.length === 0) {
      return NextResponse.json({ posts: [], total: 0 }, { status: 200 });
    }

    // Fetch full post details
    const postIds = trendingStats.map(s => s.id);
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        mentions:post_mentions(
          id,
          mentioned_user:profiles!post_mentions_user_id_fkey(id, full_name),
          mentioned_org:organizations!post_mentions_org_id_fkey(org_id, name)
        )
      `)
      .in('id', postIds)
      .eq('is_hidden', false);

    if (postsError) {
      console.error('Fetch posts error:', postsError);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Check which posts user has liked
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    const likedPostIds = new Set(likedPosts?.map(l => l.post_id) || []);

    // Enrich posts with is_liked_by_me
    const enrichedPosts = posts?.map(post => ({
      ...post,
      is_liked_by_me: likedPostIds.has(post.id),
    }));

    // Sort by engagement score (maintain trending order)
    const sortedPosts = enrichedPosts?.sort((a, b) => {
      const aScore = trendingStats.find(s => s.id === a.id)?.engagement_score || 0;
      const bScore = trendingStats.find(s => s.id === b.id)?.engagement_score || 0;
      return bScore - aScore;
    });

    return NextResponse.json({ 
      posts: sortedPosts || [],
      total: sortedPosts?.length || 0
    }, { status: 200 });
  } catch (error) {
    console.error('Trending posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
