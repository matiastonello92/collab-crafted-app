import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { addDays, startOfWeek, format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const applyTemplateSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  create_rota: z.boolean().default(true)
})

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/v1/shift-templates/[id]/apply - Apply template to week
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: templateId } = await context.params
    const body = await request.json()
    const validated = applyTemplateSchema.parse(body)

    // Fetch template with items
    const { data: template, error: templateError } = await supabase
      .from('shift_templates')
      .select(`
        *,
        shift_template_items(*)
      `)
      .eq('id', templateId)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get location timezone
    const { data: location } = await supabase
      .from('locations')
      .select('timezone, org_id')
      .eq('id', template.location_id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const timezone = location.timezone || 'Europe/Paris'

    // Create or get rota for this week
    let rotaId: string | null = null

    if (validated.create_rota) {
      const { data: existingRota } = await supabase
        .from('rotas')
        .select('id')
        .eq('location_id', template.location_id)
        .eq('week_start_date', validated.week_start_date)
        .single()

      if (existingRota) {
        rotaId = existingRota.id
      } else {
        const { data: newRota, error: rotaError } = await supabase
          .from('rotas')
          .insert({
            location_id: template.location_id,
            org_id: location.org_id,
            week_start_date: validated.week_start_date,
            status: 'draft',
            created_by: user.id
          })
          .select('id')
          .single()

        if (rotaError) {
          console.error('Error creating rota:', rotaError)
          return NextResponse.json({ error: rotaError.message }, { status: 500 })
        }

        rotaId = newRota.id
      }
    }

    // Create shifts from template items
    const weekStart = new Date(validated.week_start_date)
    const shifts = []

    for (const item of (template.shift_template_items as any[])) {
      // Calculate date for this weekday
      const shiftDate = addDays(weekStart, item.weekday)
      const dateStr = format(shiftDate, 'yyyy-MM-dd')

      // Combine date with time
      const startTimeStr = `${dateStr}T${item.start_time}`
      const endTimeStr = `${dateStr}T${item.end_time}`

      // Convert to UTC
      const startAtUTC = fromZonedTime(startTimeStr, timezone).toISOString()
      const endAtUTC = fromZonedTime(endTimeStr, timezone).toISOString()

      shifts.push({
        org_id: location.org_id,
        location_id: template.location_id,
        rota_id: rotaId,
        start_at: startAtUTC,
        end_at: endAtUTC,
        job_tag_id: item.job_tag_id || null,
        break_minutes: item.break_minutes,
        notes: item.notes || null,
        status: 'draft',
        created_by: user.id
      })
    }

    if (shifts.length > 0) {
      const { data: createdShifts, error: shiftsError } = await supabase
        .from('shifts')
        .insert(shifts)
        .select()

      if (shiftsError) {
        console.error('Error creating shifts:', shiftsError)
        return NextResponse.json({ error: shiftsError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        shifts: createdShifts,
        rota_id: rotaId 
      }, { status: 201 })
    }

    return NextResponse.json({ 
      success: true, 
      shifts: [],
      rota_id: rotaId 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
