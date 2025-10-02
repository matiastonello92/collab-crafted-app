import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('🔍 [API DEBUG] GET /api/v1/admin/locations')
  
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.log('🔍 [API DEBUG] Auth failed:', authError)
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  console.log('🔍 [API DEBUG] Auth check:', { userId: user.id })

  // RLS-only with business filter for active locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('🔍 [API DEBUG] Query error:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }

  console.log('🔍 [API DEBUG] Locations found:', { count: locations?.length })

  return NextResponse.json({ locations })
}

export async function POST(request: Request) {
  console.log('🔍 [API DEBUG] POST /api/v1/admin/locations')
  
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get org_id from profile with membership fallback
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('🔍 [API DEBUG] Profile query error:', profileError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  let orgId = profile?.org_id

  // Fallback to membership if profile has no org_id
  if (!orgId) {
    console.log('🔍 [API DEBUG] Profile has no org_id, checking membership')
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.error('🔍 [API DEBUG] Membership query error:', membershipError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!membership?.org_id) {
      console.log('🔍 [API DEBUG] No organization context for user:', user.id)
      return NextResponse.json({ error: 'No organization context' }, { status: 400 })
    }

    orgId = membership.org_id
  }

  console.log('🔍 [API DEBUG] Creating location for org:', { orgId })

  const body = await request.json()
  
  // RLS will enforce org scoping
  const { data: location, error } = await supabase
    .from('locations')
    .insert({ ...body, org_id: orgId })
    .select()
    .single()

  if (error) {
    console.error('🔍 [API DEBUG] Insert error:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }

  console.log('🔍 [API DEBUG] Location created:', { locationId: location.id })

  return NextResponse.json({ location })
}