import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createServiceNoteSchema } from '../../schemas';

// POST /api/v1/recipes/:id/service-notes - Add service note
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

    // Check recipe exists
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('org_id, location_id')
      .eq('id', params.id)
      .maybeSingle();

    if (recipeError) throw recipeError;
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createServiceNoteSchema.parse(body);

    const { data: note, error } = await supabase
      .from('recipe_service_notes')
      .insert({
        recipe_id: params.id,
        org_id: recipe.org_id,
        location_id: recipe.location_id,
        created_by: user.id,
        ...validatedData
      })
      .select(`
        *,
        created_by_profile:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    console.error('[recipes/:id/service-notes/POST]', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add service note' },
      { status: 500 }
    );
  }
}
