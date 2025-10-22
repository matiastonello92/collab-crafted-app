// Klyra Shifts API - Leave Requests (Create & Retrieve)

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { createLeaveRequestSchema } from '@/lib/shifts/validations'
import { checkLeaveCollision } from '@/lib/shifts/collision-checker'
import { ZodError } from 'zod'

// GET - Retrieve current user's leave requests
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional status filter from query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const locationId = searchParams.get('location_id')
    const weekStart = searchParams.get('week_start')

    // Build query with joins
    let query = supabase
      .from('leave_requests')
      .select(`
        id,
        org_id,
        location_id,
        user_id,
        type_id,
        start_at,
        end_at,
        reason,
        status,
        approver_id,
        approved_at,
        notes,
        converted_to_leave_id,
        created_at,
        updated_at,
        leave_types!leave_requests_type_id_fkey(
          id, 
          key, 
          label, 
          color, 
          requires_approval
        ),
        profiles!leave_requests_user_id_fkey(
          id,
          full_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Add optional filters
    if (status) {
      query = query.eq('status', status)
    }
    if (locationId) {
      query = query.eq('location_id', locationId)
    }
    if (weekStart) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      query = query
        .gte('start_at', weekStart)
        .lt('start_at', weekEnd.toISOString())
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('Error fetching user leave requests:', error)
      throw error
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/leave/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new leave request
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

    // Create leave request with dynamic approval logic
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        org_id: profile.org_id,
        location_id: validated.location_id,
        user_id: user.id,
        type_id: validated.type_id,
        start_at: validated.start_at,
        end_at: validated.end_at,
        reason: validated.reason,
        status: leaveType.requires_approval ? 'pending' : 'approved',
        approver_id: leaveType.requires_approval ? null : user.id,
        approved_at: leaveType.requires_approval ? null : new Date().toISOString(),
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
