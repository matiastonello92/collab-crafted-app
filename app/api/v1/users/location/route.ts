// Get users for a specific location with their primary job tag
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    if (!locationId) {
      return NextResponse.json(
        { error: 'location_id required' },
        { status: 400 }
      )
    }

    // Call RPC function
    const { data, error } = await supabase
      .rpc('get_users_for_location', { p_location_id: locationId })

    if (error) {
      console.error('Error fetching users for location:', error)
      throw error
    }

    return NextResponse.json({ users: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/users/location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
