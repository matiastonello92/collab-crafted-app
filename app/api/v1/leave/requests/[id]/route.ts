// Klyra Shifts API - Cancel Leave Request (Self-Service)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('user_id, status')
      .eq('id', params.id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Verify user owns this request
    if (leaveRequest.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: can only cancel own leave requests' },
        { status: 403 }
      )
    }

    // Can only cancel pending requests
    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Invalid leave status',
          message: `Cannot cancel leave request with status: ${leaveRequest.status}`
        },
        { status: 400 }
      )
    }

    // Update status to cancelled
    const { data: updated, error } = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling leave request:', error)
      throw error
    }

    return NextResponse.json({ leave_request: updated })
  } catch (error) {
    console.error('Error in PUT /api/v1/leave/requests/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
