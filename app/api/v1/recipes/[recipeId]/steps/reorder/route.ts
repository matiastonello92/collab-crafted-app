import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { recipeId } = await params;
    const { stepOrders } = await request.json();
    
    // Verify recipe ownership
    const { data: recipe } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', recipeId)
      .single();
    
    if (!recipe || recipe.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update step_number for each step
    for (const { id, step_number } of stepOrders) {
      await supabase
        .from('recipe_steps')
        .update({ step_number })
        .eq('id', id)
        .eq('recipe_id', recipeId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering steps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
