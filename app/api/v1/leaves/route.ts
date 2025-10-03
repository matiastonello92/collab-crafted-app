// Klyra Shifts API - Leaves (Definitive Absences)
// Manager-created leaves or approved leave requests

import { NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { z } from 'zod'

const createLeaveSchema = z.object({
  user_id: z.string().uuid(),
  location_id: z.string().uuid(),
  type_id: z.string().uuid(),
  start_at: z.string(),
  end_at: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

// GET - Fetch leaves for planner
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const weekStart = searchParams.get('week_start')

    if (!locationId) {
      return NextResponse.json(
        { error: 'location_id required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('leaves')
      .select(`
        *,
        leave_types(id, key, label, color),
        user:profiles(id, full_name, email, avatar_url)
      `)
      .eq('location_id', locationId)

    if (weekStart) {
      const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('start_at', weekStart).lt('end_at', weekEnd)
    }

    const { data, error } = await query.order('start_at', { ascending: true })

    if (error) {
      console.error('Error fetching leaves:', error)
      throw error
    }

    return NextResponse.json({ leaves: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/leaves:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create leave (manager only)
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
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
      return NextResponse.json(
        { error: 'Forbidden: shifts:manage permission required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = createLeaveSchema.parse(body)

    // Get org_id from location
    const { data: location } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .single()

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check for collisions with existing leaves
    const { data: existingLeaves } = await supabase
      .from('leaves')
      .select('id')
      .eq('user_id', validated.user_id)
      .eq('location_id', validated.location_id)
      .or(`start_at.lte.${validated.end_at},end_at.gte.${validated.start_at}`)

    if (existingLeaves && existingLeaves.length > 0) {
      return NextResponse.json(
        { 
          error: 'LEAVE_COLLISION',
          message: 'Esiste già un\'assenza per questo utente in questo periodo'
        },
        { status: 409 }
      )
    }

    // Create leave
    const { data: leave, error } = await supabase
      .from('leaves')
      .insert({
        org_id: location.org_id,
        location_id: validated.location_id,
        user_id: validated.user_id,
        type_id: validated.type_id,
        start_at: validated.start_at,
        end_at: validated.end_at,
        reason: validated.reason || null,
        notes: validated.notes || null,
        created_by: user.id,
      })
      .select(`
        *,
        leave_types(id, key, label, color),
        user:profiles(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error creating leave:', error)
      throw error
    }

    return NextResponse.json({ leave }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/leaves:', error)
    
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

// DELETE - Delete leave (owner only)
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leaveId = searchParams.get('id')

    if (!leaveId) {
      return NextResponse.json(
        { error: 'leave_id required' },
        { status: 400 }
      )
    }

    // RLS policy will ensure only owner can delete
    const { error } = await supabase
      .from('leaves')
      .delete()
      .eq('id', leaveId)
      .eq('user_id', user.id) // Extra safety check

    if (error) {
      console.error('Error deleting leave:', error)
      throw error
    }

    return NextResponse.json({ message: 'Leave deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/v1/leaves:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
