import { NextRequest, NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createJobTagSchema, updateJobTagSchema } from '@/lib/admin/validations'

/**
 * GET /api/v1/admin/job-tags
 * Lista job tags dell'org corrente
 * Query params: ?is_active=true&categoria=Cucina
 */
export async function GET(request: NextRequest) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    let query = supabase
      .from('job_tags')
      .select('*')
      .eq('org_id', orgId)
      .order('categoria', { ascending: true })
      .order('label_it', { ascending: true })

    // Filtri opzionali
    const isActive = searchParams.get('is_active')
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const categoria = searchParams.get('categoria')
    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching job tags:', error)
      return NextResponse.json({ error: 'Failed to fetch job tags' }, { status: 500 })
    }

    return NextResponse.json({ jobTags: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/admin/job-tags
 * Crea nuovo job tag (solo Org Admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { label_it, categoria, color, is_active } = validation.data
    const supabase = await createSupabaseServerClient()

    // Generate key server-side via SQL function
    const { data: keyResult } = await supabase.rpc('generate_job_tag_key', {
      p_label: label_it
    })

    const key = keyResult || label_it.toLowerCase().replace(/\s+/g, '_')

    // Insert job tag
    const { data, error } = await supabase
      .from('job_tags')
      .insert({
        org_id: orgId,
        key,
        label_it,
        categoria: categoria || null,
        color: color || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Un tag con questo nome esiste già per questa organizzazione' },
          { status: 409 }
        )
      }
      console.error('Error creating job tag:', error)
      return NextResponse.json({ error: 'Failed to create job tag' }, { status: 500 })
    }

    return NextResponse.json({ jobTag: data }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
