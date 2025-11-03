import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { generateFullRecipePrintTemplate, generateStationRecipePrintTemplate } from '@/lib/recipes/print-templates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const targetServings = parseInt(searchParams.get('servings') || '4');
    const variant = searchParams.get('variant') || 'full'; // 'full' | 'station'
    const isDraft = searchParams.get('isDraft') === 'true';

    const supabase = createSupabaseAdminClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recipe with all relations
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        id,
        title,
        description,
        servings,
        prep_time_minutes,
        cook_time_minutes,
        photo_url,
        created_at,
        created_by_profile:profiles!recipes_created_by_fkey(full_name),
        recipe_ingredients(
          id,
          quantity,
          unit,
          item_name_snapshot,
          is_optional,
          notes,
          sort_order,
          sub_recipe_id,
          sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey(
            id,
            title,
            servings
          )
        ),
        recipe_steps(
          step_number,
          instruction,
          photo_url
        ),
        recipe_allergens(
          allergen
        ),
        recipe_service_notes(
          note,
          created_at,
          author:profiles!recipe_service_notes_created_by_fkey(full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Transform data for template
    const printData = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || undefined,
      servings: recipe.servings,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      photo_url: recipe.photo_url || undefined,
      created_by_name: Array.isArray(recipe.created_by_profile) 
        ? recipe.created_by_profile[0]?.full_name 
        : (recipe.created_by_profile as any)?.full_name,
      created_at: recipe.created_at,
      ingredients: (recipe.recipe_ingredients || [])
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((ing: any) => ({
          id: ing.id,
          quantity: ing.quantity,
          unit: ing.unit,
          item_name_snapshot: ing.item_name_snapshot,
          is_optional: ing.is_optional,
          notes: ing.notes || undefined,
          sub_recipe: ing.sub_recipe ? {
            title: ing.sub_recipe.title,
            servings: ing.sub_recipe.servings
          } : undefined
        })),
      steps: (recipe.recipe_steps || [])
        .sort((a: any, b: any) => a.step_number - b.step_number)
        .map((step: any) => ({
          step_number: step.step_number,
          instruction: step.instruction,
          photo_url: step.photo_url || undefined
        })),
      allergens: (recipe.recipe_allergens || []).map((a: any) => a.allergen),
      service_notes: (recipe.recipe_service_notes || []).map((note: any) => ({
        note: note.note,
        author_name: note.author?.full_name,
        created_at: note.created_at
      }))
    };

    // Generate HTML based on variant
    const html = variant === 'station'
      ? generateStationRecipePrintTemplate(printData, targetServings, isDraft)
      : generateFullRecipePrintTemplate(printData, targetServings, isDraft);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error generating print template:', error);
    return NextResponse.json(
      { error: 'Failed to generate print template' },
      { status: 500 }
    );
  }
}
