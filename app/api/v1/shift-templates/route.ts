import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  location_id: z.string().uuid(),
  items: z.array(z.object({
    weekday: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    job_tag_id: z.string().uuid().optional(),
    break_minutes: z.number().int().min(0).default(0),
    notes: z.string().optional(),
    sort_order: z.number().int().default(0)
  }))
})

// GET /api/v1/shift-templates - List templates
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('location_id')

    let query = supabase
      .from('shift_templates')
      .select(`
        *,
        shift_template_items(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/v1/shift-templates - Create template
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = createTemplateSchema.parse(body)

    // Get location's org_id
    const { data: location } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .single()

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('shift_templates')
      .insert({
        name: validated.name,
        description: validated.description,
        location_id: validated.location_id,
        org_id: location.org_id,
        created_by: user.id
      })
      .select()
      .single()

    if (templateError) {
      console.error('Error creating template:', templateError)
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    // Create template items
    if (validated.items.length > 0) {
      const items = validated.items.map(item => ({
        template_id: template.id,
        org_id: location.org_id,
        location_id: validated.location_id,
        weekday: item.weekday,
        start_time: item.start_time,
        end_time: item.end_time,
        job_tag_id: item.job_tag_id || null,
        break_minutes: item.break_minutes,
        notes: item.notes || null,
        sort_order: item.sort_order
      }))

      const { error: itemsError } = await supabase
        .from('shift_template_items')
        .insert(items)

      if (itemsError) {
        console.error('Error creating template items:', itemsError)
        // Rollback template
        await supabase.from('shift_templates').delete().eq('id', template.id)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
