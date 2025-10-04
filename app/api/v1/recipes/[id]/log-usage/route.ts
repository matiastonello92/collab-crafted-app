import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const logUsageSchema = z.object({
  eventType: z.enum(['cook_mode_opened', 'recipe_printed'] as const),
  metadata: z.record(z.string(), z.any()).optional()
});

// POST /api/v1/recipes/:id/log-usage - Log recipe usage (telemetry)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = logUsageSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { eventType, metadata = {} } = validation.data;

    // Get recipe to verify access and get org/location
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, org_id, location_id')
      .eq('id', params.id)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Insert usage log
    const { error: logError } = await supabase
      .from('recipe_usage_logs')
      .insert({
        recipe_id: params.id,
        user_id: user.id,
        org_id: recipe.org_id,
        location_id: recipe.location_id,
        event_type: eventType,
        metadata
      });

    if (logError) throw logError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[recipes/:id/log-usage/POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log usage' },
      { status: 500 }
    );
  }
}
