import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/users called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)
    
    // Get location_id filter if provided
    const locationId = request.nextUrl.searchParams.get('location_id')
    console.log('🔍 [API DEBUG] Query params:', { locationId })

    // Derive org_id from user's membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.log('❌ [API DEBUG] Membership query error:', membershipError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

    // Use RPC function to get users (handles complex JOIN properly)
    const { data: users, error } = await supabase.rpc('get_users_for_location', {
      p_location_id: locationId || null,
      p_org_id: orgId
    })

    if (error) {
      console.error('❌ [API DEBUG] RPC error:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Users fetched:', users?.length || 0)

    // Fetch emails using admin client (auth.users table only)
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    
    const emailMap = new Map()
    if (authData?.users) {
      authData.users.forEach(u => {
        emailMap.set(u.id, u.email)
      })
    }

    // Add emails to users
    const usersWithEmails = (users || []).map((u: { id: string; full_name: string }) => ({
      ...u,
      email: emailMap.get(u.id) || ''
    }))

    console.log('✅ [API DEBUG] Response ready with', usersWithEmails.length, 'users')
    return NextResponse.json({ users: usersWithEmails })

  } catch (error: any) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
