import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUserPermission } from '@/lib/api/permissions-check';

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    const canShare = await checkUserPermission(supabase, user.id, 'posts:share');
    if (!canShare) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { shareComment } = body;

    // Check if post exists and user can access it
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, org_id, author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prevent sharing own post
    if (post.author_id === user.id) {
      return NextResponse.json({ error: 'Cannot share own post' }, { status: 400 });
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('post_shares')
      .select('id')
      .eq('original_post_id', postId)
      .eq('shared_by', user.id)
      .single();

    if (existingShare) {
      return NextResponse.json({ error: 'Already shared' }, { status: 409 });
    }

    // Create share
    const { data: share, error: shareError } = await supabase
      .from('post_shares')
      .insert({
        original_post_id: postId,
        shared_by: user.id,
        org_id: post.org_id,
        share_comment: shareComment || null,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Share creation error:', shareError);
      return NextResponse.json({ error: 'Failed to share post' }, { status: 500 });
    }

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Share post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete share
    const { error: deleteError } = await supabase
      .from('post_shares')
      .delete()
      .eq('original_post_id', postId)
      .eq('shared_by', user.id);

    if (deleteError) {
      console.error('Unshare error:', deleteError);
      return NextResponse.json({ error: 'Failed to unshare post' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unshare post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
