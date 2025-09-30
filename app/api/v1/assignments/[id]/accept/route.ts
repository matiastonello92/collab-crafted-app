// Klyra Shifts API - Accept/Decline Shift Assignment (Self-Service)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { acceptAssignmentSchema } from '@/lib/shifts/validations'
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

    const body = await request.json()
    const validated = acceptAssignmentSchema.parse(body)

    // Fetch assignment with shift details
    const { data: assignment, error: fetchError } = await supabase
      .from('shift_assignments')
      .select(`
        *,
        shifts!inner(id, start_at, end_at)
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Verify user owns this assignment
    if (assignment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: can only accept/decline own assignments' },
        { status: 403 }
      )
    }

    // Verify assignment is in proposed/assigned state
    if (!['proposed', 'assigned'].includes(assignment.status)) {
      return NextResponse.json(
        { 
          error: 'Invalid assignment state',
          message: `Cannot accept/decline assignment with status: ${assignment.status}`
        },
        { status: 400 }
      )
    }

    // If accepting, check collision
    if (validated.accept) {
      const shift = assignment.shifts as any
      const hasCollision = await checkShiftCollision(
        user.id,
        shift.start_at,
        shift.end_at,
        shift.id // Exclude this shift from collision check
      )

      if (hasCollision) {
        return NextResponse.json(
          { 
            error: 'SHIFT_COLLISION',
            message: 'You already have an overlapping shift'
          },
          { status: 409 }
        )
      }
    }

    // Update assignment status
    const newStatus = validated.accept ? 'accepted' : 'declined'
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('shift_assignments')
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating assignment:', updateError)
      throw updateError
    }

    return NextResponse.json({ assignment: updatedAssignment })
  } catch (error) {
    console.error('Error in POST /api/v1/assignments/[id]/accept:', error)
    
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
