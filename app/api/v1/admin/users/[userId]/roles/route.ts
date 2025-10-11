import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

interface AssignRoleRequest {
  role_id: string
  location_id?: string
}

interface RevokeRoleRequest {
  role_id: string
  location_id?: string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/users/[userId]/roles called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)
    const body: AssignRoleRequest = await req.json()

    if (!body.role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    console.log('🔍 [API DEBUG] Assignment request:', { userId, role_id: body.role_id, location_id: body.location_id })

    // Verify role exists and get org_id
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, display_name, org_id')
      .eq('id', body.role_id)
      .single()

    if (roleError || !role) {
      console.log('❌ [API DEBUG] Role not found')
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    console.log('✅ [API DEBUG] Role verified:', role.name)

    // If location_id provided, verify it belongs to same org
    if (body.location_id) {
      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('id, name, org_id')
        .eq('id', body.location_id)
        .single()

      if (locError || !location || location.org_id !== role.org_id) {
        console.log('❌ [API DEBUG] Location not found or org mismatch')
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }

      console.log('✅ [API DEBUG] Location verified:', location.name)
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('user_roles_locations')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('role_id', body.role_id)
      .eq('location_id', body.location_id || null)
      .single()

    if (existing?.is_active) {
      console.log('⚠️ [API DEBUG] Role already assigned')
      return NextResponse.json({ error: 'Role already assigned' }, { status: 409 })
    }

    // Assign role using RLS policies
    const roleData = {
      user_id: userId,
      role_id: body.role_id,
      location_id: body.location_id || null,
      org_id: role.org_id,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
      is_active: true
    }

    let result
    if (existing) {
      // Reactivate existing assignment
      const { data, error } = await supabase
        .from('user_roles_locations')
        .update({
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      result = { data, error }
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('user_roles_locations')
        .insert(roleData)
        .select()
        .single()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('❌ [API DEBUG] Assignment error:', result.error)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Role assigned:', result.data?.id)
    return NextResponse.json({ 
      success: true, 
      assignment: result.data,
      message: `Role "${role.display_name}" assigned successfully` 
    })

  } catch (error: any) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  try {
    console.log('🔍 [API DEBUG] DELETE /api/v1/admin/users/[userId]/roles called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)
    const body: RevokeRoleRequest = await req.json()

    if (!body.role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    console.log('🔍 [API DEBUG] Revocation request:', { userId, role_id: body.role_id, location_id: body.location_id })

    // Find assignment using RLS
    const { data: assignment, error: findError } = await supabase
      .from('user_roles_locations')
      .select(`
        id,
        is_active,
        roles!inner (
          id,
          name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .eq('role_id', body.role_id)
      .eq('location_id', body.location_id || null)
      .or('is_active.is.null,is_active.eq.true')
      .single()

    if (findError || !assignment) {
      console.log('❌ [API DEBUG] Assignment not found')
      return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 })
    }

    // Deactivate assignment using RLS
    const { error: updateError } = await supabase
      .from('user_roles_locations')
      .update({ is_active: false })
      .eq('id', assignment.id)

    if (updateError) {
      console.error('❌ [API DEBUG] Revocation error:', updateError)
      return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 })
    }

    const role = (assignment.roles as any)
    console.log('✅ [API DEBUG] Role revoked:', role.name)

    return NextResponse.json({ 
      success: true,
      message: `Role "${role.display_name}" revoked successfully`
    })

  } catch (error: any) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
