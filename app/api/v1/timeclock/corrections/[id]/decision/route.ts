// Klyra Shifts API - Time Correction Decision (Manager Approve/Reject)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { decideCorrectionSchema } from '@/lib/shifts/timeclock-validations'
import { ZodError } from 'zod'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = decideCorrectionSchema.parse(body)

    // Get correction request
    const { data: correction, error: correctionError } = await supabase
      .from('time_correction_requests')
      .select('*, location:locations(org_id)')
      .eq('id', params.id)
      .single()

    if (correctionError || !correction) {
      return NextResponse.json(
        { error: 'Correction request not found' },
        { status: 404 }
      )
    }

    if (correction.status !== 'pending') {
      return NextResponse.json(
        { error: 'Correction request already processed' },
        { status: 400 }
      )
    }

    // Verify user has timeclock:manage permission
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'timeclock:manage'
    })

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: timeclock:manage permission required' },
        { status: 403 }
      )
    }

    const adminClient = createSupabaseAdminClient()

    // Update correction request status
    const newStatus = validated.decision === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await adminClient
      .from('time_correction_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: validated.notes
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating correction request:', updateError)
      throw updateError
    }

    // If approved and event_id exists, update the time_clock_event
    if (validated.decision === 'approve' && correction.event_id) {
      const { error: eventUpdateError } = await adminClient
        .from('time_clock_events')
        .update({
          occurred_at: correction.requested_time
        })
        .eq('id', correction.event_id)

      if (eventUpdateError) {
        console.error('Error updating clock event:', eventUpdateError)
        // Don't throw - correction is approved even if event update fails
      }
    }

    return NextResponse.json({
      message: validated.decision === 'approve' ? 'Correction approved' : 'Correction rejected',
      status: newStatus
    })
  } catch (error) {
    console.error('Error in POST /api/v1/timeclock/corrections/[id]/decision:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
