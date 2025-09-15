import { NextResponse } from "next/server"
import { checkOrgAdmin } from "@/lib/admin/guards"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { hasAccess } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: managers, error } = await supabase.rpc('admin_list_location_admins', { 
    loc_id: params.id 
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 })
  }

  return NextResponse.json({ managers })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { hasAccess } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email } = await request.json()
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase.rpc('admin_assign_manager', {
    loc_id: params.id,
    target_email: email
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { hasAccess } = await checkOrgAdmin()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email } = await request.json()
  const supabase = createSupabaseAdminClient()
  
  const { error } = await supabase.rpc('admin_remove_manager', {
    loc_id: params.id,
    target_email: email
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}