// Check if rota exists for location and week
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const weekStartDate = searchParams.get('week_start_date')

    if (!locationId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check permission
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for existing rota
    const { data: existingRota, error } = await supabase
      .from('rotas')
      .select('id, status, week_start_date')
      .eq('location_id', locationId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle()

    if (error) {
      console.error('Error checking rota:', error)
      throw error
    }

    return NextResponse.json({
      exists: !!existingRota,
      rota: existingRota || null
    })
  } catch (error) {
    console.error('Error in GET /api/v1/rotas/check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
