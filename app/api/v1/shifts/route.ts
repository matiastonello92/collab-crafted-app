// Klyra Shifts API - Shifts (List & Create)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createShiftSchema } from '@/lib/shifts/validations'
import { isDateInWeek } from '@/lib/shifts/timezone-utils'
import { getMonday, formatDateForDB } from '@/lib/shifts/week-utils'
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
    const locationId = searchParams.get('location_id')

    // RLS policies will handle permissions - no need for explicit check

    // Build query with JOINs to load assignments + users + job tags
    let query = supabase
      .from('shifts')
      .select(`
        *,
        job_tags(id, key, label_it, color),
        rotas(id, status),
        assignments:shift_assignments(
          id,
          user_id,
          status,
          user:profiles(id, full_name, email, avatar_url)
        )
      `)
      .order('start_at', { ascending: true })
    
    if (rotaId) {
      query = query.eq('rota_id', rotaId)
    }

    if (locationId) {
      query = query.eq('location_id', locationId)
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
    
    console.log('📥 [SHIFTS POST] Request body:', body);
    
    const validated = createShiftSchema.parse(body)

    // ===== AUTO-CREATE ROTA LOGIC =====
    let rotaId = validated.rota_id
    let orgId: string
    let locationId: string

    if (!rotaId && validated.location_id) {
      // Calculate Monday of the week from shift start_at
      const shiftDate = new Date(validated.start_at)
      const weekMonday = getMonday(shiftDate)
      const weekStartDate = formatDateForDB(weekMonday)

      console.log('🗓️ [AUTO-ROTA] Week start (Monday):', weekStartDate, 'from shift date:', shiftDate.toISOString())

      // Check if rota exists for this location + week
      const { data: existingRota } = await supabase
        .from('rotas')
        .select('id, org_id, location_id')
        .eq('location_id', validated.location_id)
        .eq('week_start_date', weekStartDate)
        .maybeSingle()

      if (existingRota) {
        console.log('✅ [AUTO-ROTA] Found existing rota:', existingRota.id)
        rotaId = existingRota.id
        orgId = existingRota.org_id
        locationId = existingRota.location_id
      } else {
        // Auto-create new rota
        console.log('🆕 [AUTO-ROTA] Creating new rota for week:', weekStartDate)
        
        const { data: location, error: locErr } = await supabase
          .from('locations')
          .select('org_id, id')
          .eq('id', validated.location_id)
          .single()

        if (locErr || !location) {
          console.error('❌ [AUTO-ROTA] Location not found:', locErr)
          return NextResponse.json(
            { error: 'Location not found' },
            { status: 404 }
          )
        }

        const { data: newRota, error: rotaErr } = await supabase
          .from('rotas')
          .insert({
            org_id: location.org_id,
            location_id: location.id,
            week_start_date: weekStartDate,
            status: 'draft',
            created_by: user.id,
          })
          .select('id, org_id, location_id')
          .single()

        if (rotaErr || !newRota) {
          console.error('❌ [AUTO-ROTA] Failed to create rota:', rotaErr)
          return NextResponse.json(
            { error: 'Failed to create rota for this week' },
            { status: 500 }
          )
        }

        console.log('✅ [AUTO-ROTA] Created new rota:', newRota.id)
        rotaId = newRota.id
        orgId = newRota.org_id
        locationId = newRota.location_id
      }
    } else if (rotaId) {
      // Existing flow: explicit rota_id provided
      console.log('🔍 [SHIFTS POST] Using explicit rota_id:', rotaId)
      
      const { data: rota, error: rotaError } = await supabase
        .from('rotas')
        .select('org_id, location_id, week_start_date')
        .eq('id', rotaId)
        .single()

      if (rotaError || !rota) {
        console.error('❌ [SHIFTS POST] Rota not found:', rotaError)
        return NextResponse.json(
          { error: 'Rota not found' },
          { status: 404 }
        )
      }

      orgId = rota.org_id
      locationId = rota.location_id

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
      
      console.log('✅ [SHIFTS POST] Derived org_id:', orgId, 'location_id:', locationId)
    } else {
      return NextResponse.json(
        { error: 'Either rota_id or location_id required' },
        { status: 400 }
      )
    }

    // Create shift(s) - support batch creation with quantity
    const quantity = validated.quantity || 1
    const shiftsToCreate = Array.from({ length: quantity }, () => ({
      org_id: orgId,
      location_id: locationId,
      rota_id: rotaId,
      job_tag_id: validated.job_tag_id,
      start_at: validated.start_at,
      end_at: validated.end_at,
      break_minutes: validated.break_minutes,
      notes: validated.notes,
      created_by: user.id,
    }))

    const { data: shifts, error } = await supabase
      .from('shifts')
      .insert(shiftsToCreate)
      .select()

    if (error) {
      console.error('Error creating shift(s):', error)
      throw error
    }

    return NextResponse.json({ 
      shift: shifts?.[0], // Return first shift for backward compatibility
      shifts, // Return all shifts
      count: shifts?.length || 0 
    }, { status: 201 })
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
