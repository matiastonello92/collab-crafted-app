import { NextRequest, NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'
import { updateUserJobTagSchema } from '@/lib/admin/validations'

/**
 * PUT /api/v1/admin/user-job-tags/:id
 * Aggiorna assegnazione (is_primary, note)
 * Gestisce transazionalmente l'unicità del tag primario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = updateUserJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const updates: any = {}

    if (validation.data.is_primary !== undefined) {
      updates.is_primary = validation.data.is_primary
    }

    if (validation.data.note !== undefined) {
      updates.note = validation.data.note
    }

    // Update (trigger handles primary uniqueness)
    const { data, error } = await supabase
      .from('user_job_tags')
      .update(updates)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select(`
        *,
        job_tag:job_tags(id, label_it, key, categoria, color, is_active)
      `)
      .single()

    if (error) {
      console.error('Error updating user job tag:', error)
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json({ assignment: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/admin/user-job-tags/:id
 * Rimuove assegnazione job tag
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('user_job_tags')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (error) {
      console.error('Error deleting user job tag:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Assegnazione rimossa' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
