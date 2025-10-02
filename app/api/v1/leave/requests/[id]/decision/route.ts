// Klyra Shifts API - Approve/Reject Leave Request (Manager Only)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { decideLeaveRequestSchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: leave:manage (Manager)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = decideLeaveRequestSchema.parse(body)

    // Fetch leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('status')
      .eq('id', params.id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Can only approve/reject pending requests
    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Invalid leave status',
          message: `Cannot decide on leave request with status: ${leaveRequest.status}`
        },
        { status: 400 }
      )
    }

    const newStatus = validated.decision === 'approve' ? 'approved' : 'rejected'

    // Update leave request
    const { data: updated, error } = await supabase
      .from('leave_requests')
      .update({
        status: newStatus,
        approver_id: user.id,
        approved_at: new Date().toISOString(),
        notes: validated.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error deciding leave request:', error)
      throw error
    }

    // Trigger email notification for leave decision
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/v1/notifications/leave-decision`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ leaveRequestId: params.id })
    }).catch(err => console.error('Failed to trigger leave decision email:', err));

    return NextResponse.json({ 
      leave_request: updated,
      message: `Leave request ${newStatus} successfully`
    })
  } catch (error) {
    console.error('Error in PUT /api/v1/leave/requests/[id]/decision:', error)
    
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
