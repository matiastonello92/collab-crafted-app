// Klyra Shifts API - Shift Update & Delete

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { updateShiftSchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

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

    // Check permission: shifts:manage
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateShiftSchema.parse(body)

    // Update shift (RLS ensures user can only update shifts in their org/locations)
    const { data: shift, error } = await supabase
      .from('shifts')
      .update({
        ...validated,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating shift:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Shift not found or access denied' },
          { status: 404 }
        )
      }
      
      throw error
    }

    return NextResponse.json({ shift })
  } catch (error) {
    console.error('Error in PUT /api/v1/shifts/[id]:', error)
    
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: shifts:manage
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete shift (cascade will handle shift_assignments)
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting shift:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Shift not found or access denied' },
          { status: 404 }
        )
      }
      
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE /api/v1/shifts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
