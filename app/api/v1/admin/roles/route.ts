import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin/guards"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Check admin access using centralized guard
    const { hasAccess } = await checkAdminAccess()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    
    // Check if filtering for invite form only
    const inviteOnly = request.nextUrl.searchParams.get('inviteOnly') === 'true'

    let query = supabaseAdmin
      .from('roles')
      .select('id, name, display_name, level, description')
      .eq('is_active', true)
    
    if (inviteOnly) {
      query = query.in('name', ['base', 'manager'])
    }
    
    const { data: roles, error } = await query.order('level', { ascending: true })

    if (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    return NextResponse.json({ roles: roles || [] })

  } catch (error: any) {
    console.error('Error in roles endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}