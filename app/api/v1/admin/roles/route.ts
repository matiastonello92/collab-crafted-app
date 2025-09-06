import { NextResponse } from "next/server"
import { admin } from "@/lib/supabase/service"
import { checkAdminAccess } from "@/lib/admin/guards"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Check admin access using centralized guard
    const { hasAccess } = await checkAdminAccess()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = admin

    // Fetch all active roles
    const { data: roles, error } = await supabaseAdmin
      .from('roles')
      .select('id, name, display_name, level, description')
      .eq('is_active', true)
      .order('level', { ascending: true })

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