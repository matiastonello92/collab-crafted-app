// Klyra Shifts API - Time Correction Decision (Manager Approve/Reject)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { decideCorrectionSchema } from '@/lib/shifts/timeclock-validations'
import { ZodError } from 'zod'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/timeclock/corrections/[id]/decision called', { id: params.id })
    
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    const body = await request.json()
    const validated = decideCorrectionSchema.parse(body)

    console.log('✅ [API DEBUG] Request validated:', validated.decision)

    // Get correction request (RLS will enforce access)
    const { data: correction, error: correctionError } = await supabase
      .from('time_correction_requests')
      .select('*, location:locations(org_id)')
      .eq('id', params.id)
      .single()

    if (correctionError || !correction) {
      console.log('❌ [API DEBUG] Correction not found or access denied')
      return NextResponse.json(
        { error: 'Correction request not found' },
        { status: 404 }
      )
    }

    if (correction.status !== 'pending') {
      console.log('❌ [API DEBUG] Correction already processed:', correction.status)
      return NextResponse.json(
        { error: 'Correction request already processed' },
        { status: 400 }
      )
    }

    console.log('✅ [API DEBUG] Correction found:', correction.id)

    // Update correction request status (RLS will enforce access)
    const newStatus = validated.decision === 'approve' ? 'approved' : 'rejected'

    const { error: updateError } = await supabase
      .from('time_correction_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: validated.notes
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('❌ [API DEBUG] Error updating correction request:', updateError)
      throw updateError
    }

    console.log('✅ [API DEBUG] Correction updated:', newStatus)

    // If approved, update the original event or shift
    if (validated.decision === 'approve') {
      if (correction.event_id) {
        const { error: eventUpdateError } = await supabase
          .from('time_clock_events')
          .update({
            occurred_at: correction.requested_time
          })
          .eq('id', correction.event_id)

        if (eventUpdateError) {
          console.error('❌ [API DEBUG] Error updating clock event:', eventUpdateError)
        } else {
          console.log('✅ [API DEBUG] Clock event updated')
        }
      } else if (correction.shift_id) {
        const { error: shiftUpdateError } = await supabase
          .from('shifts')
          .update({
            actual_start_at: correction.requested_time
          })
          .eq('id', correction.shift_id)

        if (shiftUpdateError) {
          console.error('❌ [API DEBUG] Error updating shift actual_start_at:', shiftUpdateError)
        } else {
          console.log('✅ [API DEBUG] Shift actual_start_at updated to:', correction.requested_time)
        }
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
