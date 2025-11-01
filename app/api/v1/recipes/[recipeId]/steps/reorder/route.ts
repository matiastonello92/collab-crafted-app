import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    const supabase = await createSupabaseServerClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stepOrders } = await request.json()
    
    if (!Array.isArray(stepOrders)) {
      return NextResponse.json({ error: 'Invalid step orders' }, { status: 400 })
    }

    // Verify recipe ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('created_by, organization_id')
      .eq('id', recipeId)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Check permission
    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'recipes:manage'
    })

    if (!hasPermission && recipe.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update all steps in batch
    const updates = stepOrders.map(({ id, step_number }: { id: string; step_number: number }) =>
      supabase
        .from('recipe_steps')
        .update({ step_number })
        .eq('id', id)
        .eq('recipe_id', recipeId)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering steps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
