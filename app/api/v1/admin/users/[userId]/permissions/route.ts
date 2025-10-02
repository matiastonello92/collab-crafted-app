import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { normalizeSet } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/users/[userId]/permissions called', { userId: params.userId })
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)
    
    // Get current user's org_id from membership
    const { data: currentMembership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!currentMembership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'User org not found' }, { status: 403 })
    }

    const currentOrgId = currentMembership.org_id
    console.log('✅ [API DEBUG] Current user org_id:', currentOrgId)

    const targetUserId = params.userId

    // Verify target user belongs to same org (RLS will enforce this)
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile || targetProfile.org_id !== currentOrgId) {
      console.log('❌ [API DEBUG] Target user not in same org')
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 404 })
    }

    console.log('✅ [API DEBUG] Target user verified:', targetUserId)

    // Get user role assignments (RLS enforced)
    const { data: assignments } = await supabase
      .from('user_roles_locations')
      .select('role_id, location_id')
      .eq('user_id', targetUserId)
      .or('is_active.is.null,is_active.eq.true')

    const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean)
    const permSet = new Set<string>()

    console.log('✅ [API DEBUG] Role assignments found:', roleIds.length)

    // Get permissions from roles
    if (roleIds.length > 0) {
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds)

      if (rolePermissions && rolePermissions.length > 0) {
        const permissionIds = rolePermissions.map(rp => rp.permission_id).filter(Boolean)
        if (permissionIds.length > 0) {
          const { data: permissions } = await supabase
            .from('permissions')
            .select('name')
            .in('id', permissionIds)

          ;(permissions || []).forEach(p => {
            if (p.name) permSet.add(p.name)
          })
        }
      }
    }

    // Get permission overrides (RLS enforced)
    const { data: overrides } = await supabase
      .from('user_permissions')
      .select('granted, permissions!inner(name)')
      .eq('user_id', targetUserId)

    ;(overrides || []).forEach(ov => {
      const name = (ov.permissions as any)?.name as string | undefined
      if (!name) return
      if (ov.granted) permSet.add(name)
      else permSet.delete(name)
    })

    // Check if user is admin via membership
    let targetIsAdmin = targetProfile.org_id === currentOrgId
    if (targetIsAdmin) {
      const { data: targetMembership } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', targetUserId)
        .eq('org_id', currentOrgId)
        .single()
      
      targetIsAdmin = targetMembership?.role === 'admin'
    }

    // Check platform admin via supabaseAdmin (no RLS on platform_admins)
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: platformAdminRecord } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', targetUserId)
      .maybeSingle()
    
    if (platformAdminRecord) {
      targetIsAdmin = true
      permSet.add('*')
    } else if (targetIsAdmin) {
      permSet.add('*')
    }

    const permissions = normalizeSet(Array.from(permSet))
    const body: any = { permissions }
    if (targetIsAdmin) body.is_admin = true

    console.log('✅ [API DEBUG] Permissions calculated:', permissions.length, 'isAdmin:', targetIsAdmin)

    return NextResponse.json(body, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error?.message ?? 'internal' }, { status: 500 })
  }
}