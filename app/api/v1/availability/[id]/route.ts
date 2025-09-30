import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const availabilityId = params.id

  // Delete availability entry (RLS ensures user can only delete their own)
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('id', availabilityId)
    .eq('user_id', user.id) // Extra safety check

  if (deleteError) {
    console.error('Error deleting availability:', deleteError)
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
