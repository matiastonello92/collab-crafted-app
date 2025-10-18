// Klyra Shifts API - Job Tags (for Kiosk)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    // Get location org_id
    const { data: location } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', locationId)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Get job tags for this organization
    const { data: jobTags, error } = await supabase
      .from('job_tags')
      .select('id, key, label_it, categoria, color')
      .eq('org_id', location.org_id)
      .eq('is_active', true)
      .order('categoria', { ascending: true })
      .order('label_it', { ascending: true })

    if (error) {
      console.error('Error fetching job tags:', error)
      return NextResponse.json({ error: 'Failed to fetch job tags' }, { status: 500 })
    }

    return NextResponse.json({ jobTags: jobTags || [] }, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/v1/job-tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
