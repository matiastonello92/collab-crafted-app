import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { normalizePermission } from '@/lib/permissions'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: { roleId: string } }) {
  const roleId = params.roleId
  if (!roleId) return NextResponse.json({ error: 'roleId required' }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: rp, error: e1 } = await admin.from('role_permissions').select('permission_id').eq('role_id', roleId)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const ids = (rp ?? []).map((r: any) => r.permission_id).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ permissions: [] })

  const { data: perms, error: e2 } = await admin.from('permissions').select('name').in('id', ids)
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  const normalized = (perms ?? [])
    .map((p: any) => p?.name)
    .filter(Boolean)
    .map((n: string) => normalizePermission(n))

  return NextResponse.json({ permissions: Array.from(new Set(normalized)) })
}