import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { z } from 'zod';

const syncItemsSchema = z.object({
  items: z.array(z.object({
    catalog_item_id: z.string().uuid(),
    section: z.enum(['pantry', 'fridge', 'freezer']).optional(),
    sort_order: z.number().default(0),
    uom_override: z.string().optional(),
    unit_price_override: z.number().optional()
  }))
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = syncItemsSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('inventory_templates')
      .select('org_id, location_id')
      .eq('id', params.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete existing items
    await supabase
      .from('inventory_template_items')
      .delete()
      .eq('template_id', params.id);

    // Insert new items
    if (validated.items.length > 0) {
      const items = validated.items.map(item => ({
        ...item,
        template_id: params.id,
        org_id: template.org_id,
        location_id: template.location_id
      }));

      const { error: insertError } = await supabase
        .from('inventory_template_items')
        .insert(items);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to sync items' }, { status: 500 });
  }
}