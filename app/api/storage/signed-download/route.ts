import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const name = searchParams.get('name')

    if (!bucket || !name) {
      return NextResponse.json({ error: 'Missing bucket or name parameter' }, { status: 400 })
    }

    // Validate bucket is allowed
    const allowedBuckets = ['avatars', 'branding', 'photos']
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id from profile for path validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Validate path based on bucket type
    if (bucket === 'avatars') {
      // For avatars: must be <org_id>/<user_id>/avatar.jpg
      const expectedPrefix = `${profile.org_id}/${user.id}/`
      if (!name.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: 'Access denied to this avatar path' }, { status: 403 })
      }
    } else if (bucket === 'branding' || bucket === 'photos') {
      // For branding/photos: must start with <org_id>/
      const expectedPrefix = `${profile.org_id}/`
      if (!name.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: 'Access denied to this org path' }, { status: 403 })
      }
    }

    // Create signed URL (15 minutes = 900 seconds)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(name, 900)

    if (error) {
      console.error('Storage signed URL error:', error)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Signed download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}