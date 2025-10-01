// GET /api/v1/compliance/violations - List violations

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/compliance/violations')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('🔍 [API DEBUG] Auth failed:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 [API DEBUG] Auth check:', { userId: user.id })

    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    const location_id = searchParams.get('location_id')
    const is_silenced = searchParams.get('is_silenced')
    const severity = searchParams.get('severity')

    console.log('🔍 [API DEBUG] Query params:', { user_id, location_id, is_silenced, severity })

    // RLS will handle permissions
    let query = supabase
      .from('compliance_violations')
      .select(`
        *,
        rule:rule_id (
          id,
          rule_key,
          display_name,
          description,
          threshold_value
        )
      `)
      .order('violation_date', { ascending: false })

    if (user_id) query = query.eq('user_id', user_id)
    if (location_id) query = query.eq('location_id', location_id)
    if (is_silenced !== null) query = query.eq('is_silenced', is_silenced === 'true')
    if (severity) query = query.eq('severity', severity)

    const { data, error } = await query

    if (error) {
      console.error('🔍 [API DEBUG] Query error:', error)
      throw error
    }

    console.log('🔍 [API DEBUG] Violations found:', { count: data?.length })

    return NextResponse.json({ violations: data })
  } catch (err: any) {
    console.error('GET /api/v1/compliance/violations error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
