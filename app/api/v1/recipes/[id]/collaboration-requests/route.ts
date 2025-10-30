import { createSupabaseServerActionClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/v1/recipes/:id/collaboration-requests
 * Get all collaboration requests for a recipe (creator/admin only)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeId = params.id

    // Get requests with requester profile info
    const { data: requests, error } = await supabase
      .from('recipe_collaboration_requests')
      .select(`
        *,
        requester:profiles!recipe_collaboration_requests_requester_id_fkey(id, full_name, avatar_url),
        reviewer:profiles!recipe_collaboration_requests_reviewed_by_fkey(id, full_name)
      `)
      .eq('recipe_id', recipeId)
      .order('requested_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: requests || [] })
  } catch (error: any) {
    console.error('[collaboration-requests/GET]', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}
