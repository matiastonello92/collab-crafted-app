import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { checkIsAdmin } from "@/lib/data/admin"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Verify admin permissions
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // Fetch all permissions
    const { data: permissions, error } = await supabaseAdmin
      .from('permissions')
      .select('id, name, display_name, category, description')
      .order('category', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Error fetching permissions:', error)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    return NextResponse.json({ permissions: permissions || [] })

  } catch (error: any) {
    console.error('Error in permissions endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}