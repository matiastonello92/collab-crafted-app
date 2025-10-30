import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/recipes/:id/request-collaboration
 * Request collaboration on a draft recipe
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message } = await request.json()
    const recipeId = params.id

    // Get recipe details
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('status, created_by, org_id, location_id, title')
      .eq('id', recipeId)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (recipe.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only request collaboration on draft recipes' },
        { status: 400 }
      )
    }

    if (recipe.created_by === user.id) {
      return NextResponse.json(
        { error: 'You are the creator of this recipe' },
        { status: 400 }
      )
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('recipe_collaboration_requests')
      .select('id, status')
      .eq('recipe_id', recipeId)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending request' },
          { status: 400 }
        )
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already a collaborator' },
          { status: 400 }
        )
      }
    }

    // Create collaboration request
    const { data: collaborationRequest, error } = await supabase
      .from('recipe_collaboration_requests')
      .insert({
        recipe_id: recipeId,
        requester_id: user.id,
        message: message || null,
        org_id: recipe.org_id,
        location_id: recipe.location_id,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      request: collaborationRequest,
      message: `Collaboration request sent for "${recipe.title}"`
    })
  } catch (error: any) {
    console.error('[request-collaboration/POST]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create request' },
      { status: 500 }
    )
  }
}
