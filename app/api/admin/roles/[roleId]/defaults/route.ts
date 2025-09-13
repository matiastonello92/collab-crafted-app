import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { normalizePermission } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { roleId: string } }) {
  try {
    const roleId = params.roleId
    if (!roleId) {
      return NextResponse.json({ error: 'roleId required' }, { status: 400 })
    }

    // Auth check
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: user.id })
    
    if (!isAdmin) {
      const { data: hasPermission } = await supabaseAdmin.rpc('user_has_permission', { 
        p_user: user.id, 
        p_permission: 'manage_users' 
      })
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get user's org_id
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership?.org_id) {
      return NextResponse.json({ error: 'User org not found' }, { status: 404 })
    }

    // Get permission presets for this role and org
    const { data: rolePresets, error: rolePresetsError } = await supabaseAdmin
      .from('role_permission_presets')
      .select(`
        preset_id,
        permission_presets!inner(
          org_id,
          name
        )
      `)
      .eq('role_id', roleId)
      .eq('permission_presets.org_id', membership.org_id)

    if (rolePresetsError) {
      console.error('Error fetching role presets:', rolePresetsError)
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
    }

    // Get all permission items for the found presets
    const presetIds = (rolePresets || []).map(rp => rp.preset_id).filter(Boolean)
    
    const allPermissions: string[] = []
    
    if (presetIds.length > 0) {
      const { data: presetItems, error: itemsError } = await supabaseAdmin
        .from('permission_preset_items')
        .select('permission')
        .in('preset_id', presetIds)
        .eq('org_id', membership.org_id)

      if (itemsError) {
        console.error('Error fetching preset items:', itemsError)
        return NextResponse.json({ error: 'Failed to fetch preset items' }, { status: 500 })
      }

      for (const item of presetItems || []) {
        if (item.permission) {
          allPermissions.push(item.permission)
        }
      }
    }

    // Normalize permissions
    const normalized = allPermissions
      .filter(Boolean)
      .map((permission: string) => normalizePermission(permission))
      .filter(Boolean)

    // Deduplicate
    const uniquePermissions = Array.from(new Set(normalized))

    return NextResponse.json({ 
      permissions: uniquePermissions,
      roleId,
      presetCount: rolePresets?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/v1/admin/roles/[roleId]/defaults:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}