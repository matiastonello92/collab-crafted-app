import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { assignJobTagSchema } from '@/lib/admin/validations'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/user-job-tags called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError) {
      console.error('❌ [API DEBUG] Membership query error:', membershipError)
      return NextResponse.json({
        error: 'Database error',
        details: membershipError.message
      }, { status: 500 })
    }

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found for user:', user.id)
      return NextResponse.json({ error: 'No organization membership' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const userId = searchParams.get('user_id')
    console.log('🔍 [API DEBUG] Query params:', { locationId, userId })
    
    let query = supabase
      .from('user_job_tags')
      .select(`
        id,
        user_id,
        job_tag_id,
        location_id,
        is_primary,
        note,
        assigned_by,
        assigned_at,
        job_tag:job_tags(id, label_it, key, categoria, color, is_active)
      `)
      .eq('org_id', orgId)
      .order('is_primary', { ascending: false })

    if (locationId) query = query.eq('location_id', locationId)
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw error

    console.log('✅ [API DEBUG] Assignments fetched:', data?.length || 0)
    return NextResponse.json({ assignments: data })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/user-job-tags called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    const body = await request.json()
    console.log('🔍 [API DEBUG] Request body:', body)
    
    const validation = assignJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('❌ [API DEBUG] Validation failed:', validation.error.issues)
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 })
    }

    const { location_id, user_id, job_tag_id, is_primary, note } = validation.data

    // Derive org_id from location
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', location_id)
      .single()

    if (locError || !location) {
      console.log('❌ [API DEBUG] Location not found')
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const orgId = location.org_id
    console.log('✅ [API DEBUG] Derived org_id from location:', orgId)

    const { data, error } = await supabase
      .from('user_job_tags')
      .insert({
        org_id: orgId,
        location_id,
        user_id,
        job_tag_id,
        is_primary: is_primary || false,
        note: note || null,
        assigned_by: user.id,
      })
      .select(`*, job_tag:job_tags(*)`)
      .single()

    if (error) {
      console.error('❌ [API DEBUG] Insert error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tag già assegnato' }, { status: 409 })
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'ID non valido (user, location o tag)' }, { status: 400 })
      }
      if (error.code === '42501') {
        return NextResponse.json({ error: 'Permessi insufficienti per questa location' }, { status: 403 })
      }
      return NextResponse.json({ 
        error: 'Errore di salvataggio', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Assignment created:', data?.id)
    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
