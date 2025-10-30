import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/v1/recipes/:id/collaboration-requests/:requestId/reject
 * Reject a collaboration request (creator/admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: recipeId, requestId } = params

    // Get collaboration request
    const { data: collaborationRequest, error: requestError } = await supabase
      .from('recipe_collaboration_requests')
      .select('*, recipe:recipes(*)')
      .eq('id', requestId)
      .eq('recipe_id', recipeId)
      .single()

    if (requestError || !collaborationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (collaborationRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already ${collaborationRequest.status}` },
        { status: 400 }
      )
    }

    // Check permissions (creator or admin)
    const recipe = collaborationRequest.recipe
    const isCreator = recipe.created_by === user.id
    const { data: canManage } = await supabase.rpc('user_can_manage_recipes', {
      p_org_id: recipe.org_id,
      p_location_id: recipe.location_id
    })

    if (!isCreator && !canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('recipe_collaboration_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    return NextResponse.json({ 
      success: true,
      message: 'Collaboration request rejected'
    })
  } catch (error: any) {
    console.error('[reject-collaboration/POST]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject request' },
      { status: 500 }
    )
  }
}
