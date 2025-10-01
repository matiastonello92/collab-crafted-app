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

  // Get user's org_id from profile or membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'User org not found' }, { status: 403 })
  }

  console.log('🔍 [API DEBUG] User org:', { orgId: profile.org_id })

  // RLS will filter by org
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('org_id', profile.org_id)
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

  // Get user's org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'User org not found' }, { status: 403 })
  }

  console.log('🔍 [API DEBUG] Creating location for org:', { orgId: profile.org_id })

  const body = await request.json()
  
  // RLS will enforce org scoping
  const { data: location, error } = await supabase
    .from('locations')
    .insert({ ...body, org_id: profile.org_id })
    .select()
    .single()

  if (error) {
    console.error('🔍 [API DEBUG] Insert error:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }

  console.log('🔍 [API DEBUG] Location created:', { locationId: location.id })

  return NextResponse.json({ location })
}