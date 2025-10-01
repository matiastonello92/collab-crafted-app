import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/roles called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)
    
    const inviteOnly = request.nextUrl.searchParams.get('inviteOnly') === 'true'
    console.log('🔍 [API DEBUG] Query params:', { inviteOnly })

    let query = supabase
      .from('roles')
      .select('id, name, display_name, level, description')
      .eq('org_id', orgId)
      .eq('is_active', true)
    
    if (inviteOnly) {
      query = query.in('name', ['base', 'manager'])
    }
    
    const { data: roles, error } = await query.order('level', { ascending: true })

    if (error) {
      console.error('❌ [API DEBUG] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Roles fetched:', roles?.length || 0)
    return NextResponse.json({ roles: roles || [] })

  } catch (error: any) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
