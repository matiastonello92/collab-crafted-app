import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Query shifts assigned to current user with published/locked rotas
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select(`
      *,
      rota:rotas!inner(
        id,
        status,
        week_start_date,
        location_id
      ),
      assignments:shift_assignments!inner(
        id,
        status,
        user_id,
        published_at,
        acknowledged_at,
        created_at
      ),
      job_tag:job_tags(
        id,
        name,
        label
      )
    `)
    .eq('assignments.user_id', user.id)
    .in('rota.status', ['published', 'locked'])
    .gte('start_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Error fetching my shifts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ shifts: shifts || [] })
}
