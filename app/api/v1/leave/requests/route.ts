// Klyra Shifts API - Leave Requests (Create)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { createLeaveRequestSchema } from '@/lib/shifts/validations'
import { checkLeaveCollision } from '@/lib/shifts/collision-checker'
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createLeaveRequestSchema.parse(body)

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User organization not found' },
        { status: 400 }
      )
    }

    // Verify leave type exists and is active
    const { data: leaveType, error: typeError } = await supabase
      .from('leave_types')
      .select('requires_approval')
      .eq('id', validated.type_id)
      .eq('is_active', true)
      .single()

    if (typeError || !leaveType) {
      return NextResponse.json(
        { error: 'Invalid or inactive leave type' },
        { status: 400 }
      )
    }

    // Check collision with existing leave requests
    const hasCollision = await checkLeaveCollision(
      user.id,
      validated.start_at,
      validated.end_at
    )

    if (hasCollision) {
      return NextResponse.json(
        { 
          error: 'LEAVE_COLLISION',
          message: 'You already have an overlapping leave request'
        },
        { status: 409 }
      )
    }

    // Soft validation: warn if overlapping with assigned shifts
    const { checkShiftCollision } = await import('@/lib/shifts/collision-checker')
    const hasShiftOverlap = await checkShiftCollision(
      user.id,
      validated.start_at,
      validated.end_at
    )

    let warning = null
    if (hasShiftOverlap) {
      warning = 'This leave request overlaps with one or more assigned shifts. Please coordinate with your manager.'
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        org_id: profile.org_id,
        user_id: user.id,
        type_id: validated.type_id,
        start_at: validated.start_at,
        end_at: validated.end_at,
        reason: validated.reason,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leave request:', error)
      throw error
    }

    return NextResponse.json({ 
      leave_request: leaveRequest,
      warning 
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/leave/requests:', error)
    
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
