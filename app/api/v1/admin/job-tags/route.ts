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

    // RLS-only: no explicit org_id derivation
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('is_active')
    const categoria = searchParams.get('categoria')
    console.log('🔍 [API DEBUG] Query params:', { isActive, categoria })
    
    let query = supabase
      .from('job_tags')
      .select('*')
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

    // Get org_id from profile with membership fallback
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('❌ [API DEBUG] Profile query error:', profileError)
      return NextResponse.json({
        error: 'Database error',
        details: profileError.message
      }, { status: 500 })
    }

    let orgId = profile?.org_id

    // Fallback to membership if profile has no org_id
    if (!orgId) {
      console.log('🔍 [API DEBUG] Profile has no org_id, checking membership')
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) {
        console.error('❌ [API DEBUG] Membership query error:', membershipError)
        return NextResponse.json({
          error: 'Database error',
          details: membershipError.message
        }, { status: 500 })
      }

      if (!membership?.org_id) {
        console.log('❌ [API DEBUG] No organization context for user:', user.id)
        return NextResponse.json({ error: 'Nessun contesto organizzazione' }, { status: 400 })
      }

      orgId = membership.org_id
    }

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
