import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/utils/supabase/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { checkIsAdmin } from "@/lib/data/admin"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

interface SetOverrideRequest {
  permission_id: string
  granted: boolean // true for allow, false for deny
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

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()
    
    // Verify admin permissions
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current user for audit
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = params
    const body: SetOverrideRequest = await req.json()

    // Validate input
    if (!body.permission_id || typeof body.granted !== 'boolean') {
      return NextResponse.json({ 
        error: 'permission_id and granted (boolean) are required' 
      }, { status: 400 })
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

    // Verify permission exists
    const { data: permission, error: permissionError } = await supabaseAdmin
      .from('permissions')
      .select('id, name, display_name, category')
      .eq('id', body.permission_id)
      .single()

    if (permissionError || !permission) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
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

    // Check if override already exists
    const { data: existing } = await supabaseAdmin
      .from('user_permissions')
      .select('id, granted')
      .eq('user_id', userId)
      .eq('permission_id', body.permission_id)
      .eq('location_id', body.location_id || null)
      .single()

    const overrideData = {
      user_id: userId,
      permission_id: body.permission_id,
      location_id: body.location_id || null,
      granted: body.granted,
      granted_by: user.id,
      granted_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing override
      const { data, error } = await supabaseAdmin
        .from('user_permissions')
        .update({
          granted: body.granted,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      
      result = { data, error }
    } else {
      // Create new override
      const { data, error } = await supabaseAdmin
        .from('user_permissions')
        .insert(overrideData)
        .select()
        .single()
      
      result = { data, error }
    }

    if (result.error) {
      console.error('Error setting permission override:', result.error)
      return NextResponse.json({ error: 'Failed to set permission override' }, { status: 500 })
    }

    const action = existing ? 'permission_override_updated' : 'permission_override_created'
    
    // Create audit log
    await createAuditLog(action, {
      user_id: userId,
      permission_id: body.permission_id,
      permission_name: permission.name,
      granted: body.granted,
      location_id: body.location_id,
      location_name: location?.name,
      previous_value: existing?.granted
    }, user.id)

    // Emit outbox event
    await emitOutboxEvent('permissions.updated', {
      user_id: userId,
      delta: {
        action,
        permission_id: body.permission_id,
        permission_name: permission.name,
        granted: body.granted,
        location_id: body.location_id,
        location_name: location?.name,
        previous_value: existing?.granted
      },
      actor_id: user.id,
      at: new Date().toISOString()
    })

    const actionText = body.granted ? 'granted' : 'denied'
    const scopeText = location ? ` for ${location.name}` : ' globally'

    return NextResponse.json({ 
      success: true, 
      override: result.data,
      message: `Permission "${permission.display_name}" ${actionText}${scopeText}` 
    })

  } catch (error: any) {
    console.error('Error in permission override:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const supabaseAdmin = createSupabaseAdminClient()
    
    // Verify admin permissions
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get current user for audit
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = params
    const url = new URL(req.url)
    const permission_id = url.searchParams.get('permission_id')
    const location_id = url.searchParams.get('location_id')

    if (!permission_id) {
      return NextResponse.json({ error: 'permission_id query parameter is required' }, { status: 400 })
    }

    // Find existing override
    const { data: existing, error: findError } = await supabaseAdmin
      .from('user_permissions')
      .select(`
        id,
        granted,
        permissions!inner (
          name,
          display_name,
          category
        ),
        locations (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('permission_id', permission_id)
      .eq('location_id', location_id || null)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Permission override not found' }, { status: 404 })
    }

    // Delete override
    const { error: deleteError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('Error removing permission override:', deleteError)
      return NextResponse.json({ error: 'Failed to remove permission override' }, { status: 500 })
    }

    const permission = (existing.permissions as any)
    const location = existing.locations as any

    // Create audit log
    await createAuditLog('permission_override_removed', {
      user_id: userId,
      permission_id,
      permission_name: permission.name,
      previous_granted: existing.granted,
      location_id,
      location_name: location?.name
    }, user.id)

    // Emit outbox event
    await emitOutboxEvent('permissions.updated', {
      user_id: userId,
      delta: {
        action: 'permission_override_removed',
        permission_id,
        permission_name: permission.name,
        previous_granted: existing.granted,
        location_id,
        location_name: location?.name
      },
      actor_id: user.id,
      at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true,
      message: `Permission override for "${permission.display_name}" removed`
    })

  } catch (error: any) {
    console.error('Error removing permission override:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}