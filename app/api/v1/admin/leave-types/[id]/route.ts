// Klyra Shifts API - Admin: Update/Delete Leave Type

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { z } from 'zod'

const updateLeaveTypeSchema = z.object({
  key: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  requires_approval: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateLeaveTypeSchema.parse(body)

    // Update leave type
    const { data: leaveType, error } = await supabase
      .from('leave_types')
      .update(validated)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating leave type:', error)
      throw error
    }

    if (!leaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ leaveType })
  } catch (error) {
    console.error('Error in PUT /api/v1/admin/leave-types/[id]:', error)
    
    if (error instanceof z.ZodError) {
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if leave type is in use
    const { data: inUse } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('type_id', params.id)
      .limit(1)
      .single()

    if (inUse) {
      return NextResponse.json(
        { error: 'Cannot delete leave type that is in use. Deactivate it instead.' },
        { status: 409 }
      )
    }

    // Delete leave type
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting leave type:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/v1/admin/leave-types/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
