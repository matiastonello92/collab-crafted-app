// Klyra Shifts API - Admin: CRUD Leave Types

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { z } from 'zod'

const createLeaveTypeSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  requires_approval: z.boolean().default(true),
})

const updateLeaveTypeSchema = createLeaveTypeSchema.partial()

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Fetch all leave types for org (including inactive)
    const { data: leaveTypes, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('label')

    if (error) {
      console.error('Error fetching leave types:', error)
      throw error
    }

    return NextResponse.json({ leaveTypes: leaveTypes || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/admin/leave-types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: leave:manage (Manager/Admin)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'leave:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createLeaveTypeSchema.parse(body)

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check for duplicate key
    const { data: existing } = await supabase
      .from('leave_types')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('key', validated.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Leave type with this key already exists' },
        { status: 409 }
      )
    }

    // Create leave type
    const { data: leaveType, error } = await supabase
      .from('leave_types')
      .insert({
        org_id: profile.org_id,
        key: validated.key,
        label: validated.label,
        color: validated.color || '#6b7280',
        requires_approval: validated.requires_approval,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating leave type:', error)
      throw error
    }

    return NextResponse.json({ leaveType }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/admin/leave-types:', error)
    
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
