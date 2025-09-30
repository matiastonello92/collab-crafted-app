import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createInventorySchema = z.object({
  location_id: z.string().uuid(),
  category: z.enum(['kitchen', 'bar', 'cleaning']),
  mode: z.enum(['template', 'last', 'empty']),
  template_id: z.string().uuid().optional(),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createInventorySchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from location instead of user profile for consistency
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', validated.location_id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    let template_id = validated.template_id;
    let template_version = null;

    // If mode is template, validate template exists
    if (validated.mode === 'template') {
      if (!template_id) {
        return NextResponse.json({ error: 'Template ID required for template mode' }, { status: 400 });
      }

      const { data: template, error: templateError } = await supabase
        .from('inventory_templates')
        .select('id, version')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
      }

      template_version = template.version;
    }

    // Create inventory header
    const { data: header, error: headerError } = await supabase
      .from('inventory_headers')
      .insert({
        org_id: location.org_id,
        location_id: validated.location_id,
        category: validated.category,
        started_by: user.id,
        notes: validated.notes,
        template_id,
        template_version,
        creation_mode: validated.mode
      })
      .select()
      .single();

    if (headerError) {
      return NextResponse.json({ error: headerError.message }, { status: 400 });
    }

    // Seed inventory lines based on mode
    if (validated.mode === 'template' && template_id) {
      // Seed from template
      const { data: templateItems } = await supabase
        .from('inventory_template_items')
        .select(`
          *,
          catalog_item:inventory_catalog_items (*)
        `)
        .eq('template_id', template_id)
        .order('sort_order');

      if (templateItems && templateItems.length > 0) {
        const lines = templateItems.map(item => ({
          header_id: header.id,
          org_id: location.org_id,
          location_id: validated.location_id,
          catalog_item_id: item.catalog_item_id,
          name_snapshot: item.catalog_item.name,
          uom_snapshot: item.uom_override || item.catalog_item.uom,
          unit_price_snapshot: item.unit_price_override || item.catalog_item.default_unit_price,
          qty: 0
        }));

        await supabase.from('inventory_lines').insert(lines);
      }
    } else if (validated.mode === 'last') {
      // Seed from last completed/approved inventory
      const { data: lastInventory } = await supabase
        .from('inventory_headers')
        .select('id')
        .eq('location_id', validated.location_id)
        .eq('category', validated.category)
        .in('status', ['completed', 'approved'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastInventory) {
        const { data: lastLines } = await supabase
          .from('inventory_lines')
          .select('*')
          .eq('header_id', lastInventory.id);

        if (lastLines && lastLines.length > 0) {
          const lines = lastLines.map(line => ({
            header_id: header.id,
            org_id: location.org_id,
            location_id: validated.location_id,
            catalog_item_id: line.catalog_item_id,
            name_snapshot: line.name_snapshot,
            uom_snapshot: line.uom_snapshot,
            unit_price_snapshot: line.unit_price_snapshot,
            qty: line.qty // Keep previous quantities for "last" mode
          }));

          await supabase.from('inventory_lines').insert(lines);
        }
      }
    }
    // For 'empty' mode, we don't seed any lines

    return NextResponse.json(header, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Create inventory error:', error);
    return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
  }
}