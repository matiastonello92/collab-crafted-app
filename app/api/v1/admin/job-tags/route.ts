import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createJobTagSchema } from '@/lib/admin/validations'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/job-tags called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('is_active')
    const categoria = searchParams.get('categoria')
    console.log('🔍 [API DEBUG] Query params:', { isActive, categoria })
    
    let query = supabase
      .from('job_tags')
      .select('*')
      .eq('org_id', orgId)
      .order('categoria', { ascending: true })
      .order('label_it', { ascending: true })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [API DEBUG] Query error:', error)
      return NextResponse.json({ error: 'Failed to fetch job tags' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Job tags fetched:', data?.length || 0)
    return NextResponse.json({ jobTags: data })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/job-tags called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

    const body = await request.json()
    const validation = createJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      console.log('❌ [API DEBUG] Validation failed:', validation.error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { label_it, categoria, color, is_active } = validation.data

    // Generate key server-side via SQL function
    const { data: keyResult } = await supabase.rpc('generate_job_tag_key', {
      p_label: label_it
    })

    const key = keyResult || label_it.toLowerCase().replace(/\s+/g, '_')
    console.log('🔍 [API DEBUG] Generated key:', key)

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
      console.error('❌ [API DEBUG] Insert error:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Un tag con questo nome esiste già per questa organizzazione' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create job tag' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Job tag created:', data?.id)
    return NextResponse.json({ jobTag: data }, { status: 201 })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
