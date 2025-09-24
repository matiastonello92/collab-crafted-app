import { NextResponse } from "next/server"
import { createSupabaseUserClient } from "@/lib/supabase/clients"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { checkOrgAdmin } from "@/lib/admin/guards"

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

// Audit log stub - TODO: replace with real audit system
async function createAuditLog(action: string, details: any, actor_id: string) {
  console.log('AUDIT LOG STUB:', { action, details, actor_id, timestamp: new Date().toISOString() })
  // TODO: Insert into audit_log table when available
}

// Event outbox stub - TODO: replace with real outbox system  
async function emitOutboxEvent(event_type: string, payload: any) {
  console.log('OUTBOX EVENT STUB:', { event_type, payload, timestamp: new Date().toISOString() })
  // TODO: Insert into event_outbox table when available
}

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin access using centralized guard
    const { userId: actorId, hasAccess } = await checkOrgAdmin()
    if (!hasAccess || !actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { userId } = params
    const body: AssignRoleRequest = await req.json()

    // Validate input
    if (!body.role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    // Verify user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify role exists
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, name, display_name')
      .eq('id', body.role_id)
      .single()

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // If location_id provided, verify location exists
    let location = null
    if (body.location_id) {
      const { data: loc, error: locError } = await supabaseAdmin
        .from('locations')
        .select('id, name')
        .eq('id', body.location_id)
        .single()

      if (locError || !loc) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      location = loc
    }

    // Check if assignment already exists
    const { data: existing } = await supabaseAdmin
      .from('user_roles_locations')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('role_id', body.role_id)
      .eq('location_id', body.location_id || null)
      .single()

    if (existing?.is_active) {
      return NextResponse.json({ error: 'Role already assigned' }, { status: 409 })
    }

    // Assign role (or reactivate existing)
    const roleData = {
      user_id: userId,
      role_id: body.role_id,
      location_id: body.location_id || null,
      assigned_by: actorId,
      assigned_at: new Date().toISOString(),
      is_active: true
    }

    let result
    if (existing) {
      // Reactivate existing assignment
      const { data, error } = await supabaseAdmin
        .from('user_roles_locations')
        .update({
          assigned_by: actorId,
          assigned_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      result = { data, error }
    } else {
      // Create new assignment
      const { data, error } = await supabaseAdmin
        .from('user_roles_locations')
        .insert(roleData)
        .select()
        .single()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('Error assigning role:', result.error)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    // Create audit log
    await createAuditLog('role_assigned', {
      user_id: userId,
      role_id: body.role_id,
      role_name: role.name,
      location_id: body.location_id,
      location_name: location?.name
    }, actorId)

    // Emit outbox event
    await emitOutboxEvent('permissions.updated', {
      user_id: userId,
      delta: {
        action: 'role_assigned',
        role_id: body.role_id,
        role_name: role.name,
        location_id: body.location_id,
        location_name: location?.name
      },
      actor_id: actorId,
      at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      assignment: result.data,
      message: `Role "${role.display_name}" assigned successfully` 
    })

  } catch (error: any) {
    console.error('Error in role assignment:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check admin access using centralized guard
    const { userId: actorId, hasAccess } = await checkOrgAdmin()
    if (!hasAccess || !actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { userId } = params
    const body: RevokeRoleRequest = await req.json()

    // Validate input
    if (!body.role_id) {
      return NextResponse.json({ error: 'role_id is required' }, { status: 400 })
    }

    // Find and deactivate role assignment
    const { data: assignment, error: findError } = await supabaseAdmin
      .from('user_roles_locations')
      .select(`
        id,
        is_active,
        roles!inner (
          id,
          name,
          display_name
        ),
        locations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('role_id', body.role_id)
      .eq('location_id', body.location_id || null)
      .eq('is_active', true)
      .single()

    if (findError || !assignment) {
      return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 })
    }

    // Deactivate assignment
    const { error: updateError } = await supabaseAdmin
      .from('user_roles_locations')
      .update({ is_active: false })
      .eq('id', assignment.id)

    if (updateError) {
      console.error('Error revoking role:', updateError)
      return NextResponse.json({ error: 'Failed to revoke role' }, { status: 500 })
    }

    const role = (assignment.roles as any)
    const location = assignment.locations as any

    // Create audit log
    await createAuditLog('role_revoked', {
      user_id: userId,
      role_id: body.role_id,
      role_name: role.name,
      location_id: body.location_id,
      location_name: location?.name
    }, actorId)

    // Emit outbox event
    await emitOutboxEvent('permissions.updated', {
      user_id: userId,
      delta: {
        action: 'role_revoked',
        role_id: body.role_id,
        role_name: role.name,
        location_id: body.location_id,
        location_name: location?.name
      },
      actor_id: actorId,
      at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: `Role "${role.display_name}" revoked successfully`
    })

  } catch (error: any) {
    console.error('Error in role revocation:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}