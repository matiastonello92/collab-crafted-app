import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { z } from 'zod';

const createTemplateSchema = z.object({
  location_id: z.string().uuid(),
  category: z.enum(['kitchen', 'bar', 'cleaning']),
  name: z.string().min(1).max(100),
  items: z.array(z.object({
    catalog_item_id: z.string().uuid(),
    sort_order: z.number().default(0),
    uom_override: z.string().optional(),
    unit_price_override: z.number().optional()
  })).optional()
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location_id = searchParams.get('location_id');
    const category = searchParams.get('category');
    const is_active = searchParams.get('is_active');

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('inventory_templates')
      .select(`
        *,
        inventory_template_items (
          *,
          catalog_item:inventory_catalog_items (
            id,
            name,
            uom,
            default_unit_price
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (location_id) query = query.eq('location_id', location_id);
    if (category) query = query.eq('category', category);
    if (is_active) query = query.eq('is_active', is_active === 'true');

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('inventory_templates')
      .insert({
        org_id: location.org_id,
        location_id: validated.location_id,
        category: validated.category,
        name: validated.name,
        created_by: user.id
      })
      .select()
      .single();

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 400 });
    }

    // Create template items if provided
    if (validated.items && validated.items.length > 0) {
      const items = validated.items.map(item => ({
        ...item,
        template_id: template.id,
        org_id: location.org_id,
        location_id: validated.location_id
      }));

      const { error: itemsError } = await supabase
        .from('inventory_template_items')
        .insert(items);

      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 400 });
      }
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
