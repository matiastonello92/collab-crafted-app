// Unified Planner Data API - Single fetch for rota + shifts + leaves
import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const weekStart = searchParams.get('week_start')

    if (!locationId || !weekStart) {
      return NextResponse.json(
        { error: 'location_id and week_start required' },
        { status: 400 }
      )
    }

    // Fetch all data in parallel for maximum performance
    const [rotaResult, shiftsResult, leavesResult] = await Promise.all([
      // Rota
      supabase
        .from('rotas')
        .select('*')
        .eq('location_id', locationId)
        .eq('week_start_date', weekStart)
        .maybeSingle(),
      
      // Shifts with all relations
      supabase
        .from('shifts')
        .select(`
          *,
          job_tag:job_tags(id, key, label_it, color, categoria),
          rotas(id, status),
          assignments:shift_assignments(
            id,
            user_id,
            status,
            user:profiles(id, full_name, email, avatar_url)
          )
        `)
        .eq('location_id', locationId)
        .gte('start_at', weekStart)
        .lt('start_at', new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('start_at', { ascending: true }),
      
      // Leave requests with explicit relationship specification to avoid ambiguity
      supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(id, key, label, color),
          user:profiles!leave_requests_user_id_fkey(id, full_name)
        `)
        .eq('location_id', locationId)
        .eq('status', 'approved')
        .gte('start_at', weekStart)
        .lt('end_at', new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
    ])

    if (rotaResult.error) console.error('Rota fetch error:', rotaResult.error)
    if (shiftsResult.error) console.error('Shifts fetch error:', shiftsResult.error)
    if (leavesResult.error) console.error('Leaves fetch error:', leavesResult.error)

    return NextResponse.json({
      rota: rotaResult.data || null,
      shifts: shiftsResult.data || [],
      leaves: leavesResult.data || [],
    })
  } catch (error) {
    console.error('Error in GET /api/v1/planner/data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
