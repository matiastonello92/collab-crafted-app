// POST /api/v1/timesheets/export - Export timesheets as CSV

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { exportTimesheetsSchema } from '@/lib/shifts/timesheet-validations'
import { generateTimesheetsCsv, generateCsvFilename } from '@/lib/exports/csv-generator'

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 [TIMESHEETS EXPORT] Starting export request');
    
    // Use server client with RLS (Inventory pattern)
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('❌ [TIMESHEETS EXPORT] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [TIMESHEETS EXPORT] User authenticated:', user.id);
    
    const body = await req.json()
    const payload = exportTimesheetsSchema.parse(body)
    
    console.log('📥 [TIMESHEETS EXPORT] Export params:', { 
      location_id: payload.location_id, 
      period_start: payload.period_start,
      period_end: payload.period_end,
      status: payload.status
    });

    const { location_id, period_start, period_end, status, fields } = payload

    // Build query (RLS will filter based on user's org and locations)
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

    if (location_id) {
      console.log('🔍 [TIMESHEETS EXPORT] Filtering by location_id:', location_id);
      query = query.eq('location_id', location_id)
    }
    if (status) {
      console.log('🔍 [TIMESHEETS EXPORT] Filtering by status:', status);
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [TIMESHEETS EXPORT] Query error:', error);
      throw error
    }
    
    console.log('✅ [TIMESHEETS EXPORT] Found timesheets:', data?.length || 0);

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
