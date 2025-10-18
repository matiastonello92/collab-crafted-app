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
      
      // Shifts with all relations - explicit field selection to ensure actual_* fields
      supabase
        .from('shifts')
        .select(`
          id, org_id, location_id, rota_id, job_tag_id,
          start_at, end_at, break_minutes,
          planned_start_at, planned_end_at, planned_break_minutes,
          actual_start_at, actual_end_at, actual_break_minutes,
          status, notes, source, created_at, updated_at,
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
      
      // Definitive leaves (approved or manager-created)
      // Fetch all leaves that overlap with the week (including multi-day leaves)
      supabase
        .from('leaves')
        .select(`
          *,
          leave_types(id, key, label, color),
          user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('location_id', locationId)
        .lt('start_at', new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .gte('end_at', weekStart)
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
