// POST /api/v1/timesheets/[id]/approve - Approve and lock timesheet

import { NextRequest, NextResponse } from 'next/server'
import { approveTimesheetSchema } from '@/lib/shifts/timesheet-validations'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const payload = approveTimesheetSchema.parse(body)
    const timesheetId = params.id

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Check if timesheet exists
    const { data: timesheet, error: fetchError } = await supabaseAdmin
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single()

    if (fetchError || !timesheet) {
      return NextResponse.json({ error: 'Timesheet non trovato' }, { status: 404 })
    }

    // Check if already approved
    if (timesheet.approved_at) {
      return NextResponse.json({ error: 'Timesheet già approvato' }, { status: 409 })
    }

    // Approve and lock
    const { data, error } = await supabaseAdmin
      .from('timesheets')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        notes: payload.notes || timesheet.notes
      })
      .eq('id', timesheetId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ timesheet: data })
  } catch (err: any) {
    console.error('POST /api/v1/timesheets/[id]/approve error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
