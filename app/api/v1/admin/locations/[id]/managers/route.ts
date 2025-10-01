import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/locations/[id]/managers called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Verify location exists and get org_id
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

    // Use admin client only for RPC that returns manager emails
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: managers, error } = await supabaseAdmin.rpc('admin_list_location_admins', { 
      loc_id: params.id 
    })

    if (error) {
      console.error('❌ [API DEBUG] RPC error:', error)
      return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Managers fetched:', managers?.length || 0)
    return NextResponse.json({ managers })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/locations/[id]/managers called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Verify location exists
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

    const { email } = await request.json()
    console.log('🔍 [API DEBUG] Assigning manager:', email)

    // Use admin client only for RPC that modifies manager assignments
    const supabaseAdmin = createSupabaseAdminClient()
    const { error } = await supabaseAdmin.rpc('admin_assign_manager', {
      loc_id: params.id,
      target_email: email
    })

    if (error) {
      console.error('❌ [API DEBUG] RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Manager assigned')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 [API DEBUG] DELETE /api/v1/admin/locations/[id]/managers called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Verify location exists
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

    const { email } = await request.json()
    console.log('🔍 [API DEBUG] Removing manager:', email)

    // Use admin client only for RPC that modifies manager assignments
    const supabaseAdmin = createSupabaseAdminClient()
    const { error } = await supabaseAdmin.rpc('admin_remove_manager', {
      loc_id: params.id,
      target_email: email
    })

    if (error) {
      console.error('❌ [API DEBUG] RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Manager removed')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
