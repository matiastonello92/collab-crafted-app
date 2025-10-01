// POST /api/v1/compliance/check - Run compliance checks

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { checkComplianceSchema } from '@/lib/shifts/compliance-validations'
import { runComplianceChecks } from '@/lib/shifts/compliance-calculator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const payload = checkComplianceSchema.parse(body)

    const { user_id, location_id, period_start, period_end } = payload

    // Get org_id from location
    const { data: location } = await supabaseAdmin
      .from('locations')
      .select('org_id')
      .eq('id', location_id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Fetch active rules for org
    const { data: rules } = await supabaseAdmin
      .from('compliance_rules')
      .select('*')
      .eq('org_id', location.org_id)
      .eq('is_active', true)

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules for this org', violations: [] })
    }

    // Fetch time clock events
    const { data: events } = await supabaseAdmin
      .from('time_clock_events')
      .select('*')
      .eq('user_id', user_id)
      .eq('location_id', location_id)
      .gte('occurred_at', period_start)
      .lte('occurred_at', period_end)
      .order('occurred_at', { ascending: true })

    // Fetch assigned shifts
    const { data: assignments } = await supabaseAdmin
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

    // Upsert violations to DB
    const upsertResults = []
    for (const v of violations) {
      const { error } = await supabaseAdmin
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
