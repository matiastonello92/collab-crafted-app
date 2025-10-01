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

    // Use RPC function to get users (handles complex JOIN properly)
    const { data: users, error } = await supabase.rpc('get_users_for_location', {
      p_org_id: orgId,
      p_location_id: locationId || null
    })

    if (error) {
      console.error('Error fetching users via RPC:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Fetch emails using admin client (auth.users table)
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    
    const emailMap = new Map()
    if (authData?.users) {
      authData.users.forEach(user => {
        emailMap.set(user.id, user.email)
      })
    }

    // Add emails to users
    const usersWithEmails = (users || []).map((user: { id: string; full_name: string }) => ({
      ...user,
      email: emailMap.get(user.id) || ''
    }))

    return NextResponse.json({ users: usersWithEmails })

  } catch (error: any) {
    console.error('Error in users endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
