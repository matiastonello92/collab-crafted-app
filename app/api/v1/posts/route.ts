import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

// Schema validation
const postsQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  filter: z.enum(['all', 'pinned', 'archived']).default('all'),
  authorId: z.string().uuid().optional(),
});

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  location_id: z.string().uuid().optional(),
  visibility: z.enum(['location', 'organization']).default('location'),
  media_urls: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
  })).default([]),
  mentioned_user_ids: z.array(z.string().uuid()).default([]),
  mentioned_org_ids: z.array(z.string().uuid()).default([]),
});

/**
 * GET /api/v1/posts - Fetch feed posts
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check posts:view permission
    const { data: canView } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:view'
    });
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const params = postsQuerySchema.parse(searchParams);

    // Build query
    let query = supabase
      .from('posts')
      .select(`
        id,
        content,
        media_urls,
        visibility,
        likes_count,
        comments_count,
        shares_count,
        is_pinned,
        created_at,
        edited_at,
        author:profiles!author_id(
          id,
          full_name,
          avatar_url
        ),
        mentions:post_mentions(
          id,
          mentioned_user:profiles!mentioned_user_id(id, full_name),
          mentioned_org:organizations!mentioned_org_id(org_id, name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(params.limit);

    // Filter by location
    if (params.locationId) {
      query = query.eq('location_id', params.locationId);
    }

    // Filter by author
    if (params.authorId) {
      query = query.eq('author_id', params.authorId);
    }

    // Filter by status
    if (params.filter === 'pinned') {
      query = query.eq('is_pinned', true);
    } else if (params.filter === 'archived') {
      query = query.eq('is_archived', true);
    } else {
      query = query.eq('is_archived', false);
    }

    // Cursor-based pagination
    if (params.cursor) {
      const [timestamp, id] = params.cursor.split('_');
      query = query.lt('created_at', new Date(timestamp).toISOString());
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get user's likes for these posts
    const postIds = posts?.map(p => p.id) || [];
    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

    // Format response
    const formattedPosts = posts?.map(post => ({
      ...post,
      is_liked_by_me: likedPostIds.has(post.id),
      my_like: undefined, // Remove internal field
    })) || [];

    // Generate next cursor
    const nextCursor = formattedPosts.length === params.limit && formattedPosts.length > 0
      ? `${formattedPosts[formattedPosts.length - 1].created_at}_${formattedPosts[formattedPosts.length - 1].id}`
      : null;

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
    });

  } catch (error) {
    console.error('GET /api/v1/posts error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/posts - Create new post
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check posts:create permission
    const { data: canCreate } = await supabase.rpc('user_has_permission', {
      p_user_id: user.id,
      p_permission: 'posts:create'
    });
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate body
    const body = await request.json();
    const postData = createPostSchema.parse(body);

    // Get user's profile to determine org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

    // Create post
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        content: postData.content,
        media_urls: postData.media_urls,
        location_id: postData.location_id || null,
        visibility: postData.visibility,
        author_id: user.id,
        org_id: profile.org_id,
      })
      .select(`
        id,
        content,
        media_urls,
        visibility,
        likes_count,
        comments_count,
        shares_count,
        is_pinned,
        created_at,
        author:profiles!author_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post', details: postError.message }, { status: 500 });
    }

    // Insert mentions
    if (postData.mentioned_user_ids.length > 0 || postData.mentioned_org_ids.length > 0) {
      const mentions = [
        ...postData.mentioned_user_ids.map(userId => ({
          post_id: newPost.id,
          mentioned_user_id: userId,
          mentioned_org_id: null,
          org_id: profile.org_id,
        })),
        ...postData.mentioned_org_ids.map(orgId => ({
          post_id: newPost.id,
          mentioned_user_id: null,
          mentioned_org_id: orgId,
          org_id: profile.org_id,
        })),
      ];

      const { error: mentionsError } = await supabase
        .from('post_mentions')
        .insert(mentions);

      if (mentionsError) {
        console.error('Error creating mentions:', mentionsError);
        // Non-blocking: post created successfully
      }

      // Fetch mentions for response
      const { data: postMentions } = await supabase
        .from('post_mentions')
        .select(`
          id,
          mentioned_user:profiles!mentioned_user_id(id, full_name),
          mentioned_org:organizations!mentioned_org_id(org_id, name)
        `)
        .eq('post_id', newPost.id);

      return NextResponse.json({ 
        post: { ...newPost, mentions: postMentions || [], is_liked_by_me: false } 
      }, { status: 201 });
    }

    return NextResponse.json({ 
      post: { ...newPost, mentions: [], is_liked_by_me: false } 
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/v1/posts error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
