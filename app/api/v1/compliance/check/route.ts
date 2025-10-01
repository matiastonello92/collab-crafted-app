// POST /api/v1/compliance/check - Run compliance checks

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { checkComplianceSchema } from '@/lib/shifts/compliance-validations'
import { runComplianceChecks } from '@/lib/shifts/compliance-calculator'

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/compliance/check')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('🔍 [API DEBUG] Auth failed:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 [API DEBUG] Auth check:', { userId: user.id })

    const body = await req.json()
    const payload = checkComplianceSchema.parse(body)

    const { user_id, location_id, period_start, period_end } = payload

    console.log('🔍 [API DEBUG] Check compliance:', { user_id, location_id, period_start, period_end })

    // Get org_id from location (RLS-protected)
    const { data: location } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', location_id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Fetch active rules for org (RLS-protected)
    const { data: rules } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('org_id', location.org_id)
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules for this org', violations: [] })
    }

    console.log('🔍 [API DEBUG] Active rules:', { count: rules.length })

    // Fetch time clock events (RLS-protected)
    const { data: events } = await supabase
      .from('time_clock_events')
      .select('*')
      .eq('user_id', user_id)
      .eq('location_id', location_id)
      .gte('occurred_at', period_start)
      .lte('occurred_at', period_end)
      .order('occurred_at', { ascending: true })

    console.log('🔍 [API DEBUG] Time clock events:', { count: events?.length })

    // Fetch assigned shifts (RLS-protected)
    const { data: assignments } = await supabase
      .from('shift_assignments')
      .select('shift_id, shifts!inner(*)')
      .eq('user_id', user_id)
      .eq('status', 'assigned')

    const shifts = assignments
      ?.map((a: any) => a.shifts)
      .filter((s: any) => {
        const start = new Date(s.start_at)
        return start >= new Date(period_start) && start <= new Date(period_end)
      }) || []

    // Run checks
    const violations = runComplianceChecks(
      user_id,
      events || [],
      shifts,
      rules,
      period_start,
      period_end
    )

    console.log('🔍 [API DEBUG] Violations detected:', { count: violations.length })

    // Upsert violations to DB (RLS-protected)
    const upsertResults = []
    for (const v of violations) {
      const { error } = await supabase
        .from('compliance_violations')
        .upsert({
          org_id: v.org_id,
          location_id: v.location_id,
          user_id: v.user_id,
          rule_id: v.rule_id,
          violation_date: v.violation_date,
          severity: v.severity,
          details: v.details,
          is_silenced: false
        }, {
          onConflict: 'user_id,rule_id,violation_date'
        })

      if (!error) upsertResults.push(v)
    }

    console.log('🔍 [API DEBUG] Violations saved:', { count: upsertResults.length })

    return NextResponse.json({
      message: 'Compliance check completed',
      violations: upsertResults,
      count: upsertResults.length
    })
  } catch (err: any) {
    console.error('POST /api/v1/compliance/check error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
