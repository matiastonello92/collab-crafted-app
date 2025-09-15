import { NextResponse } from "next/server"
import { checkOrgAdmin } from "@/lib/admin/guards"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { hasAccess } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const supabase = createSupabaseAdminClient()
  
  const { data: location, error } = await supabase
    .from('locations')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }

  return NextResponse.json({ location })
}