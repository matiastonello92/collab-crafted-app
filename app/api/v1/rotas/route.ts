// Klyra Shifts API - Rotas (List & Create)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createRotaSchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')
    const week = searchParams.get('week') // YYYY-MM-DD format

    // RLS policies will handle permissions - no need for explicit check

    // Build query with RLS (user can only see rotas for their org/locations)
    let query = supabase
      .from('rotas')
      .select('*')
      .order('week_start_date', { ascending: false })
    
    if (locationId) {
      query = query.eq('location_id', locationId)
    }
    if (week) {
      query = query.eq('week_start_date', week)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching rotas:', error)
      throw error
    }

    return NextResponse.json({ rotas: data || [] })
  } catch (error) {
    console.error('Error in GET /api/v1/rotas:', error)
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
    
    console.log('📥 [ROTAS POST] Request body:', body);
    
    const validated = createRotaSchema.parse(body)

    // Derive org_id from location (like inventory modules)
    console.log('🔍 [ROTAS POST] Deriving org_id from location_id:', validated.location_id);
    
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .maybeSingle()
    
    if (locationError) {
      console.error('❌ [ROTAS POST] Error fetching location:', locationError)
      return NextResponse.json(
        { error: 'Location lookup failed' },
        { status: 500 }
      )
    }
    
    if (!location?.org_id) {
      console.error('❌ [ROTAS POST] Location not found or no access');
      return NextResponse.json(
        { error: 'Location not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log('✅ [ROTAS POST] Derived org_id:', location.org_id);

    // Create rota (status=draft by default)
    const { data: rota, error } = await supabase
      .from('rotas')
      .insert({
        org_id: location.org_id,
        location_id: validated.location_id,
        week_start_date: validated.week_start_date,
        labor_budget_eur: validated.labor_budget_eur,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rota:', error)
      throw error
    }

    return NextResponse.json({ rota }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/rotas:', error)
    
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
