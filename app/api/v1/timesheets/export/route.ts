// POST /api/v1/timesheets/export - Export timesheets as CSV

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { exportTimesheetsSchema } from '@/lib/shifts/timesheet-validations'
import { generateTimesheetsCsv, generateCsvFilename } from '@/lib/exports/csv-generator'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await req.json()
    const payload = exportTimesheetsSchema.parse(body)

    const { location_id, period_start, period_end, status, fields } = payload

    // Build query
    let query = supabase
      .from('timesheets')
      .select(`
        *,
        user:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .gte('period_start', period_start)
      .lte('period_end', period_end)
      .order('period_start', { ascending: false })

    if (location_id) query = query.eq('location_id', location_id)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error

    // Transform data for CSV
    const timesheets = data.map((ts: any) => ({
      ...ts,
      user: {
        email: ts.user?.email,
        full_name: ts.user?.raw_user_meta_data?.full_name
      }
    }))

    // Generate CSV
    const csv = generateTimesheetsCsv(timesheets, { fields })
    const filename = generateCsvFilename('timesheets')

    // Return CSV as attachment
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (err: any) {
    console.error('POST /api/v1/timesheets/export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
