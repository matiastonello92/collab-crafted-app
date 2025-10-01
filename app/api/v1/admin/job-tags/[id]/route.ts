import { NextRequest, NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'
import { updateJobTagSchema } from '@/lib/admin/validations'

/**
 * PUT /api/v1/admin/job-tags/:id
 * Aggiorna job tag esistente
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
    const validation = updateJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const updates: any = {}

    if (validation.data.label_it) {
      updates.label_it = validation.data.label_it
      // Regenerate key if label changes
      const { data: keyResult } = await supabase.rpc('generate_job_tag_key', {
        p_label: validation.data.label_it
      })
      updates.key = keyResult || validation.data.label_it.toLowerCase().replace(/\s+/g, '_')
    }

    if (validation.data.categoria !== undefined) {
      updates.categoria = validation.data.categoria
    }

    if (validation.data.color !== undefined) {
      updates.color = validation.data.color
    }

    if (validation.data.is_active !== undefined) {
      updates.is_active = validation.data.is_active
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('job_tags')
      .update(updates)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Un tag con questo nome esiste già per questa organizzazione' },
          { status: 409 }
        )
      }
      console.error('Error updating job tag:', error)
      return NextResponse.json({ error: 'Failed to update job tag' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Job tag not found' }, { status: 404 })
    }

    return NextResponse.json({ jobTag: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/admin/job-tags/:id
 * Soft delete (is_active=false) se referenziato, altrimenti hard delete
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

    // Check if referenced in user_job_tags
    const { count } = await supabase
      .from('user_job_tags')
      .select('*', { count: 'exact', head: true })
      .eq('job_tag_id', params.id)

    if (count && count > 0) {
      // Soft delete: set is_active = false
      const { data, error } = await supabase
        .from('job_tags')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) {
        console.error('Error soft deleting job tag:', error)
        return NextResponse.json({ error: 'Failed to deactivate job tag' }, { status: 500 })
      }

      return NextResponse.json({ 
        jobTag: data, 
        message: 'Job tag disattivato (è assegnato a utenti)' 
      })
    }

    // Hard delete if not referenced
    const { error } = await supabase
      .from('job_tags')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (error) {
      console.error('Error deleting job tag:', error)
      return NextResponse.json({ error: 'Failed to delete job tag' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Job tag eliminato' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
