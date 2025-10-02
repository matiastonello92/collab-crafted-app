import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [USERS] GET /api/v1/admin/users called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [USERS] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [USERS] User authenticated:', user.id)
    
    // Get location_id filter if provided
    const locationId = request.nextUrl.searchParams.get('location_id')
    console.log('🔍 [USERS] Query params:', { locationId })

    // Derive org_id from user's membership (Inventari pattern)
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      console.log('❌ [USERS] Membership query error:', membershipError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    let orgId: string
    if (!membership?.org_id) {
      // Try to get ANY membership if user has multiple
      const { data: anyMembership, error: anyError } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      
      if (anyError || !anyMembership?.org_id) {
        console.log('❌ [USERS] No membership found')
        return NextResponse.json({ error: 'No organization' }, { status: 400 })
      }
      
      orgId = anyMembership.org_id
    } else {
      orgId = membership.org_id
    }
    console.log('✅ [USERS] Derived org_id:', orgId)

    // Build query with optional location filter (Inventari pattern - direct queries + RLS)
    let userIds: string[] | null = null

    if (locationId) {
      // If location filter, get users assigned to this location first
      console.log('🔍 [USERS] Filtering by location:', locationId)
      const { data: urlData, error: urlError } = await supabase
        .from('user_roles_locations')
        .select('user_id')
        .eq('location_id', locationId)
        .eq('org_id', orgId)
        .eq('is_active', true)

      if (urlError) {
        console.error('❌ [USERS] user_roles_locations error:', urlError)
        return NextResponse.json({ error: 'Failed to fetch location users' }, { status: 500 })
      }

      userIds = [...new Set((urlData || []).map(u => u.user_id))]
      console.log('✅ [USERS] Found', userIds.length, 'users for location')

      if (userIds.length === 0) {
        console.log('✅ [USERS] No users for this location, returning empty')
        return NextResponse.json({ users: [] })
      }
    }

    // Query profiles directly (RLS handles org filtering automatically)
    let query = supabase
      .from('profiles')
      .select('id, full_name, org_id')
      .eq('org_id', orgId)
      .order('full_name')

    if (userIds) {
      query = query.in('id', userIds)
    }

    const { data: profiles, error: profilesError } = await query

    if (profilesError) {
      console.error('❌ [USERS] Profiles query error:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log('✅ [USERS] Profiles fetched:', profiles?.length || 0)

    // Fetch emails using admin client (only for returned users - efficient)
    const supabaseAdmin = createSupabaseAdminClient()
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
          return {
            ...profile,
            email: authUser?.user?.email || ''
          }
        } catch (err) {
          console.warn('⚠️ [USERS] Failed to fetch email for user:', profile.id)
          return { ...profile, email: '' }
        }
      })
    )

    console.log('✅ [USERS] Response ready with', usersWithEmails.length, 'users')
    return NextResponse.json({ users: usersWithEmails })

  } catch (error: any) {
    console.error('❌ [USERS] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
