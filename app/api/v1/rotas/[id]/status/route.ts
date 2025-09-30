// Klyra Shifts API - Update Rota Status (draft→published→locked)

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { updateRotaStatusSchema } from '@/lib/shifts/validations'
import { ZodError } from 'zod'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission: rotas:publish (Manager/OrgAdmin)
    const { data: hasPerm } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'rotas:publish'
    })
    
    if (!hasPerm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateRotaStatusSchema.parse(body)

    // Fetch existing rota to validate transition
    const { data: existingRota, error: fetchError } = await supabase
      .from('rotas')
      .select('status')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingRota) {
      return NextResponse.json(
        { error: 'Rota not found' },
        { status: 404 }
      )
    }

    // Validate status transition (draft→published→locked)
    const validTransitions: Record<string, string[]> = {
      draft: ['published'],
      published: ['locked', 'draft'], // Can rollback to draft
      locked: [], // Cannot change locked status
    }

    if (!validTransitions[existingRota.status]?.includes(validated.status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status transition',
          message: `Cannot change status from ${existingRota.status} to ${validated.status}`
        },
        { status: 400 }
      )
    }

    // Update rota status
    const { data: updatedRota, error } = await supabase
      .from('rotas')
      .update({
        status: validated.status,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating rota status:', error)
      throw error
    }

    return NextResponse.json({ rota: updatedRota })
  } catch (error) {
    console.error('Error in PUT /api/v1/rotas/[id]/status:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
