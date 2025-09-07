import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const locationId = searchParams.get('locationId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // Get current user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('jwt_is_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('user_job_tags')
      .select(`
        tag_id,
        location_id,
        job_tags:tag_id (
          id,
          name,
          label,
          is_active
        )
      `)
      .eq('user_id', userId)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data: userJobTags, error } = await query

    if (error) {
      console.error('Error fetching user job tags:', error)
      return NextResponse.json({ error: 'Failed to fetch user job tags' }, { status: 500 })
    }

    // Transform data to return job tags with location info
    const jobTags = userJobTags?.map(ujt => ({
      ...ujt.job_tags,
      location_id: ujt.location_id
    })) || []

    return NextResponse.json({ jobTags })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, tagId, locationId } = await request.json()
    
    if (!userId || !tagId || !locationId) {
      return NextResponse.json({ error: 'userId, tagId, and locationId are required' }, { status: 400 })
    }
    
    // Get current user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('jwt_is_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert user job tag
    const { error } = await supabase
      .from('user_job_tags')
      .insert({
        user_id: userId,
        tag_id: tagId,
        location_id: locationId,
        assigned_by: user.id
      })

    if (error) {
      console.error('Error assigning job tag:', error)
      return NextResponse.json({ error: 'Failed to assign job tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, tagId, locationId } = await request.json()
    
    if (!userId || !tagId || !locationId) {
      return NextResponse.json({ error: 'userId, tagId, and locationId are required' }, { status: 400 })
    }
    
    // Get current user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('jwt_is_admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete user job tag
    const { error } = await supabase
      .from('user_job_tags')
      .delete()
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .eq('location_id', locationId)

    if (error) {
      console.error('Error removing job tag:', error)
      return NextResponse.json({ error: 'Failed to remove job tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}