import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
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
    console.log('🔍 [API DEBUG] PUT /api/v1/admin/user-job-tags/[id]', { assignmentId: params.id })
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 [API DEBUG] Auth check:', { userId: user.id })

    // Get assignment to verify org_id
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_job_tags')
      .select('org_id')
      .eq('id', params.id)
      .single()

    if (assignmentError) {
      console.error('❌ [API DEBUG] Assignment query error:', assignmentError)
      return NextResponse.json({
        error: 'Database error',
        details: assignmentError.message
      }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    console.log('🔍 [API DEBUG] Assignment org:', { orgId: assignment.org_id })

    const body = await request.json()
    const validation = updateUserJobTagSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

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
      .eq('org_id', assignment.org_id)
      .select(`
        *,
        job_tag:job_tags(id, label_it, key, categoria, color, is_active)
      `)
      .single()

    console.log('🔍 [API DEBUG] Update result:', { success: !!data, error })

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
    console.log('🔍 [API DEBUG] DELETE /api/v1/admin/user-job-tags/[id]', { assignmentId: params.id })
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get assignment to verify org_id
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_job_tags')
      .select('org_id')
      .eq('id', params.id)
      .single()

    if (assignmentError) {
      console.error('❌ [API DEBUG] Assignment query error:', assignmentError)
      return NextResponse.json({
        error: 'Database error',
        details: assignmentError.message
      }, { status: 500 })
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('user_job_tags')
      .delete()
      .eq('id', params.id)
      .eq('org_id', assignment.org_id)

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
