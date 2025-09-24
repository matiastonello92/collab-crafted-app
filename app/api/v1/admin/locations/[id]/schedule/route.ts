import { NextResponse } from "next/server"
import { createSupabaseUserClient } from "@/lib/supabase/clients"

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { opening_hours, open_days } = await request.json()
  
  // Update only schedule fields to respect trigger restrictions for managers
  const { error } = await supabase
    .from('locations')
    .update({ 
      opening_hours,
      open_days 
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}