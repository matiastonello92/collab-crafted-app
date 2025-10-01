// GET /api/v1/compliance/violations - List violations

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    const location_id = searchParams.get('location_id')
    const is_silenced = searchParams.get('is_silenced')
    const severity = searchParams.get('severity')

    let query = supabaseAdmin
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

    if (error) throw error

    return NextResponse.json({ violations: data })
  } catch (err: any) {
    console.error('GET /api/v1/compliance/violations error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
