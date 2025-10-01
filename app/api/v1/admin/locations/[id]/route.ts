import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 [API DEBUG] PATCH /api/v1/admin/locations/[id] called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Verify location exists and user has access
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', params.id)
      .single()

    if (locError || !location) {
      console.log('❌ [API DEBUG] Location not found')
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    console.log('✅ [API DEBUG] Location verified:', params.id)

    const body = await request.json()
    console.log('🔍 [API DEBUG] Update body fields:', Object.keys(body))
    
    // Update uses RLS policies to enforce permissions
    const { data: updated, error } = await supabase
      .from('locations')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('❌ [API DEBUG] Update error:', error)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Location updated:', updated?.id)
    return NextResponse.json({ location: updated })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
