// Klyra Shifts API - Shifts (List & Create)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createShiftSchema } from '@/lib/shifts/validations'
import { isDateInWeek } from '@/lib/shifts/timezone-utils'
import { ZodError } from 'zod'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rotaId = searchParams.get('rota_id')

    // Check permission: shifts:view
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:view'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build query (RLS applies)
    let query = supabase
      .from('shifts')
      .select('*')
      .order('start_at', { ascending: true })
    
    if (rotaId) {
      query = query.eq('rota_id', rotaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching shifts:', error)
      throw error
    }

    return NextResponse.json({ shifts: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/shifts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: shifts:manage (Manager/OrgAdmin)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'shifts:manage'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = createShiftSchema.parse(body)

    // Fetch rota to get org_id, location_id, and validate week range
    const { data: rota, error: rotaError } = await supabase
      .from('rotas')
      .select('org_id, location_id, week_start_date')
      .eq('id', validated.rota_id)
      .single()

    if (rotaError || !rota) {
      return NextResponse.json(
        { error: 'Rota not found' },
        { status: 404 }
      )
    }

    // Validate shift is within rota week
    if (!isDateInWeek(validated.start_at, rota.week_start_date)) {
      return NextResponse.json(
        { 
          error: 'Invalid shift date',
          message: 'Shift start_at must be within the rota week'
        },
        { status: 400 }
      )
    }

    // Create shift
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        org_id: rota.org_id,
        location_id: rota.location_id,
        rota_id: validated.rota_id,
        job_tag_id: validated.job_tag_id,
        start_at: validated.start_at,
        end_at: validated.end_at,
        break_minutes: validated.break_minutes,
        notes: validated.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating shift:', error)
      throw error
    }

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/shifts:', error)
    
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
