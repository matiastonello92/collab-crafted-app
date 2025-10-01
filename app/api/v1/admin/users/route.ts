import { NextRequest, NextResponse } from "next/server"
import { checkOrgAdmin } from "@/lib/admin/guards"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Check admin access using centralized guard
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()
    
    // Get location_id filter if provided
    const locationId = request.nextUrl.searchParams.get('location_id')

    // Build query to get users from org, optionally filtered by location
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        user_roles_locations!inner(
          location_id,
          org_id,
          is_active
        ),
        memberships!inner(
          org_id
        )
      `)
      .eq('memberships.org_id', orgId)
      .eq('user_roles_locations.org_id', orgId)
      .eq('user_roles_locations.is_active', true)

    if (locationId) {
      query = query.eq('user_roles_locations.location_id', locationId)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get unique users (deduplicate since one user can have multiple roles/locations)
    const uniqueUsersMap = new Map()
    
    for (const profile of profiles || []) {
      if (!uniqueUsersMap.has(profile.id)) {
        uniqueUsersMap.set(profile.id, {
          id: profile.id,
          full_name: profile.full_name
        })
      }
    }

    const uniqueUsers = Array.from(uniqueUsersMap.values())

    // Fetch emails using admin client (auth.users table)
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    
    const emailMap = new Map()
    if (authData?.users) {
      authData.users.forEach(user => {
        emailMap.set(user.id, user.email)
      })
    }

    // Add emails to users
    const usersWithEmails = uniqueUsers.map(user => ({
      ...user,
      email: emailMap.get(user.id) || ''
    }))

    return NextResponse.json({ users: usersWithEmails })

  } catch (error: any) {
    console.error('Error in users endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
