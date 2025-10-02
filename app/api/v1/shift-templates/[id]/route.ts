import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{ id: string }>
}

// DELETE /api/v1/shift-templates/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const { error } = await supabase
      .from('shift_templates')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
