import { NextResponse } from 'next/server'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { normalizeSet } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    const supabase = await createSupabaseUserClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    
    // Check if current user can view user permissions
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

    const targetUserId = params.userId

    // Get user role assignments
    const { data: assignments } = await supabaseAdmin
      .from('user_roles_locations')
      .select('role_id, location_id')
      .eq('user_id', targetUserId)
      .eq('is_active', true)

    const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean)
    const permSet = new Set<string>()

    // Get permissions from roles
    if (roleIds.length > 0) {
      const { data: rolePermissions } = await supabaseAdmin
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds)

      if (rolePermissions && rolePermissions.length > 0) {
        const permissionIds = rolePermissions.map(rp => rp.permission_id).filter(Boolean)
        if (permissionIds.length > 0) {
          const { data: permissions } = await supabaseAdmin
            .from('permissions')
            .select('name')
            .in('id', permissionIds)

          ;(permissions || []).forEach(p => {
            if (p.name) permSet.add(p.name)
          })
        }
      }
    }

    // Get permission overrides
    const { data: overrides } = await supabaseAdmin
      .from('user_permissions')
      .select('granted, permissions!inner(name)')
      .eq('user_id', targetUserId)

    ;(overrides || []).forEach(ov => {
      const name = (ov.permissions as any)?.name as string | undefined
      if (!name) return
      if (ov.granted) permSet.add(name)
      else permSet.delete(name)
    })

    // Check if user is admin
    const { data: targetIsAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: targetUserId })
    if (targetIsAdmin) permSet.add('*')

    const permissions = normalizeSet(Array.from(permSet))
    const body: any = { permissions }
    if (targetIsAdmin) body.is_admin = true

    return NextResponse.json(body, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json({ error: error?.message ?? 'internal' }, { status: 500 })
  }
}