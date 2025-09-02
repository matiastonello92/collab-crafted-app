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

    // Fetch all active locations
    const { data: locations, error } = await supabaseAdmin
      .from('locations')
      .select('id, name, city, country')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching locations:', error)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    return NextResponse.json({ locations: locations || [] })

  } catch (error: any) {
    console.error('Error in locations endpoint:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}