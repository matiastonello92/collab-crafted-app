import { NextRequest, NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { assignJobTagSchema } from '@/lib/admin/validations'

export async function GET(request: NextRequest) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    let query = supabase
      .from('user_job_tags')
      .select(`
        *,
        job_tag:job_tags(id, label_it, key, categoria, color, is_active)
      `)
      .eq('org_id', orgId)
      .order('is_primary', { ascending: false })

    const locationId = searchParams.get('location_id')
    if (locationId) query = query.eq('location_id', locationId)

    const userId = searchParams.get('user_id')
    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ assignments: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = assignJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 })
    }

    const { location_id, user_id, job_tag_id, is_primary, note } = validation.data
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('user_job_tags')
      .insert({
        org_id: orgId,
        location_id,
        user_id,
        job_tag_id,
        is_primary: is_primary || false,
        note: note || null,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select(`*, job_tag:job_tags(*)`)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tag già assegnato' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
