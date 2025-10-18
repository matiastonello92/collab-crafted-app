import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { addWeeks, format } from 'date-fns'

const duplicateRotaSchema = z.object({
  target_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // If not provided, next week
  copy_assignments: z.boolean().default(false)
})

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/v1/rotas/[id]/duplicate - Duplicate rota to another week
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

    const { id: rotaId } = await context.params
    const body = await request.json()
    const validated = duplicateRotaSchema.parse(body)

    // Fetch source rota with shifts
    const { data: sourceRota, error: rotaError } = await supabase
      .from('rotas')
      .select(`
        *,
        shifts(
          *,
          shift_assignments(*)
        )
      `)
      .eq('id', rotaId)
      .single()

    if (rotaError || !sourceRota) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    // Calculate target week (default: next week)
    const targetWeekStart = validated.target_week_start || 
      format(addWeeks(new Date(sourceRota.week_start_date), 1), 'yyyy-MM-dd')

    // Check if rota already exists for target week
    const { data: existingRota } = await supabase
      .from('rotas')
      .select('id')
      .eq('location_id', sourceRota.location_id)
      .eq('week_start_date', targetWeekStart)
      .single()

    if (existingRota) {
      return NextResponse.json({ 
        error: 'Rota già esistente per questa settimana' 
      }, { status: 409 })
    }

    // Create new rota
    const { data: newRota, error: newRotaError } = await supabase
      .from('rotas')
      .insert({
        location_id: sourceRota.location_id,
        org_id: sourceRota.org_id,
        week_start_date: targetWeekStart,
        status: 'draft',
        labor_budget_eur: sourceRota.labor_budget_eur,
        notes: sourceRota.notes,
        created_by: user.id
      })
      .select()
      .single()

    if (newRotaError) {
      console.error('Error creating new rota:', newRotaError)
      return NextResponse.json({ error: newRotaError.message }, { status: 500 })
    }

    // Duplicate shifts
    const sourceWeekStart = new Date(sourceRota.week_start_date)
    const targetWeekStartDate = new Date(targetWeekStart)
    const weekDiff = Math.round(
      (targetWeekStartDate.getTime() - sourceWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )

    const shiftsToCreate = []
    const shiftMapping = new Map() // old shift id -> new shift

    for (const shift of (sourceRota.shifts as any[])) {
      const oldStartAt = new Date(shift.start_at)
      const oldEndAt = new Date(shift.end_at)

      // Add week difference to dates
      const newStartAt = new Date(oldStartAt)
      newStartAt.setDate(newStartAt.getDate() + (weekDiff * 7))
      
      const newEndAt = new Date(oldEndAt)
      newEndAt.setDate(newEndAt.getDate() + (weekDiff * 7))

      const newShift = {
        org_id: shift.org_id,
        location_id: shift.location_id,
        rota_id: newRota.id,
        start_at: newStartAt.toISOString(),
        end_at: newEndAt.toISOString(),
        job_tag_id: shift.job_tag_id,
        break_minutes: shift.break_minutes,
        notes: shift.notes,
        status: 'draft',
        created_by: user.id
      }

      shiftsToCreate.push(newShift)
      shiftMapping.set(shift.id, newShift)
    }

    if (shiftsToCreate.length > 0) {
      const { data: createdShifts, error: shiftsError } = await supabase
        .from('shifts')
        .insert(shiftsToCreate)
        .select()

      if (shiftsError) {
        console.error('Error creating shifts:', shiftsError)
        // Rollback rota
        await supabase.from('rotas').delete().eq('id', newRota.id)
        return NextResponse.json({ error: shiftsError.message }, { status: 500 })
      }

      // Copy assignments if requested
      if (validated.copy_assignments && createdShifts) {
        const assignmentsToCreate = []

        for (let i = 0; i < (sourceRota.shifts as any[]).length; i++) {
          const sourceShift = (sourceRota.shifts as any[])[i]
          const newShift = createdShifts[i]

          if (sourceShift.shift_assignments && sourceShift.shift_assignments.length > 0) {
            for (const assignment of sourceShift.shift_assignments) {
              assignmentsToCreate.push({
                shift_id: newShift.id,
                user_id: assignment.user_id,
                org_id: assignment.org_id,
                status: 'assigned', // Directly assigned on duplicate
                assigned_at: new Date().toISOString(),
                assigned_by: user.id
              })
            }
          }
        }

        if (assignmentsToCreate.length > 0) {
          await supabase
            .from('shift_assignments')
            .insert(assignmentsToCreate)
        }
      }

      return NextResponse.json({ 
        success: true,
        rota: newRota,
        shifts_created: createdShifts.length
      }, { status: 201 })
    }

    return NextResponse.json({ 
      success: true,
      rota: newRota,
      shifts_created: 0
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
