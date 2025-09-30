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
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: shifts:assign (Manager)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:assign'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = assignShiftSchema.parse(body)

    // Fetch shift to get time range and org_id
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('start_at, end_at, org_id')
      .eq('id', params.id)
      .single()

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Check collision (only for assigned/accepted status)
    if (validated.status === 'assigned') {
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
    }

    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('shift_assignments')
      .select('id, status')
      .eq('shift_id', params.id)
      .eq('user_id', validated.user_id)
      .single()

    let assignment

    if (existingAssignment) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('shift_assignments')
        .update({
          status: validated.status,
          assigned_at: validated.status === 'assigned' ? new Date().toISOString() : null,
          proposed_at: validated.status === 'proposed' ? new Date().toISOString() : null,
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
          status: validated.status,
          assigned_at: validated.status === 'assigned' ? new Date().toISOString() : null,
          proposed_at: validated.status === 'proposed' ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) throw error
      assignment = data
    }

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
  }
}
