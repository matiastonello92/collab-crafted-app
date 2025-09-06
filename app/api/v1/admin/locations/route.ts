import { NextResponse } from "next/server"
import { checkAdminAccess } from "@/lib/admin/guards"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export async function GET() {
  const { hasAccess } = await checkAdminAccess()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }

  return NextResponse.json({ locations })
}

export async function POST(request: Request) {
  const { hasAccess } = await checkAdminAccess()
  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const supabase = createSupabaseAdminClient()
  
  const { data: location, error } = await supabase
    .from('locations')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }

  return NextResponse.json({ location })
}