// Klyra Shifts API - Assign Shift to User

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { assignShiftSchema } from '@/lib/shifts/validations'
import { checkShiftCollision } from '@/lib/shifts/collision-checker'
import { ZodError } from 'zod'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let assignment: any
  let shift: any
  
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: shifts:assign OR shifts:manage
    const { data: hasAssignPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:assign'
    })

    const { data: hasManagePerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:manage'
    })
    
    if (!hasAssignPerm && !hasManagePerm) {
      return NextResponse.json({ 
        error: 'Forbidden - requires shifts:assign or shifts:manage permission' 
      }, { status: 403 })
    }

    const body = await request.json()
    const validated = assignShiftSchema.parse(body)

    // Fetch shift to get time range and org_id
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select('start_at, end_at, org_id, location_id')
      .eq('id', params.id)
      .single()

    if (shiftError || !shiftData) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }
    
    shift = shiftData

    // Always check collision since status is always 'assigned'
    const hasCollision = await checkShiftCollision(
      validated.user_id,
      shift.start_at,
      shift.end_at
    )

    if (hasCollision) {
      return NextResponse.json(
        { 
          error: 'SHIFT_COLLISION',
          message: 'User already has an overlapping shift'
        },
        { status: 409 }
      )
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('shift_id', params.id)
      .eq('user_id', validated.user_id)
      .maybeSingle()

    if (existingAssignment) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('shift_assignments')
        .update({
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: user.id
        })
        .eq('id', existingAssignment.id)
        .select()
        .single()

      if (error) throw error
      assignment = data
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({
          shift_id: params.id,
          user_id: validated.user_id,
          org_id: shift.org_id,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: user.id
        })
        .select()
        .single()

      if (error) throw error
      assignment = data
    }

    // Trigger email notification for shift assignment
    const changeType = existingAssignment ? 'modified' : 'assigned';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/v1/notifications/shift-assignment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ 
        shiftId: params.id, 
        userId: validated.user_id,
        changeType
      })
    }).catch(err => console.error('Failed to trigger shift assignment email:', err));

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/shifts/[id]/assign:', error)
    
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
  } finally {
    // Async compliance check (fire-and-forget)
    // Don't await to avoid blocking the response
    if (assignment?.user_id && shift) {
      const shiftDate = new Date(shift.start_at).toISOString().split('T')[0]
      const periodStart = shiftDate
      const periodEnd = new Date(new Date(shiftDate).setDate(new Date(shiftDate).getDate() + 7))
        .toISOString().split('T')[0]
      
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'lovable.app') || 'http://localhost:3000'}/api/v1/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: assignment.user_id,
          location_id: shift.location_id,
          period_start: periodStart,
          period_end: periodEnd
        })
      }).catch(err => console.error('Background compliance check failed:', err))
    }
  }
}
