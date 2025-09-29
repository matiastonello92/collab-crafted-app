import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const bulkUpsertSchema = z.object({
  header_id: z.string().uuid(),
  lines: z.array(z.object({
    catalog_item_id: z.string().uuid(),
    qty: z.number().min(0),
    unit_price_snapshot: z.number().min(0).optional()
  }))
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = bulkUpsertSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get header info to verify permissions
    const { data: header, error: headerError } = await supabase
      .from('inventory_headers')
      .select('org_id, location_id, status')
      .eq('id', validated.header_id)
      .single();

    if (headerError || !header) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    if (header.status === 'approved') {
      return NextResponse.json({ error: 'Cannot modify approved inventory' }, { status: 400 });
    }

    // Process each line
    const results = [];
    for (const lineData of validated.lines) {
      // Get catalog item details
      const { data: catalogItem } = await supabase
        .from('inventory_catalog_items')
        .select('name, uom, default_unit_price')
        .eq('id', lineData.catalog_item_id)
        .single();

      if (!catalogItem) continue;

      // Upsert the line
      const { data: line, error: lineError } = await supabase
        .from('inventory_lines')
        .upsert({
          header_id: validated.header_id,
          org_id: header.org_id,
          location_id: header.location_id,
          catalog_item_id: lineData.catalog_item_id,
          name_snapshot: catalogItem.name,
          uom_snapshot: catalogItem.uom,
          unit_price_snapshot: lineData.unit_price_snapshot || catalogItem.default_unit_price,
          qty: lineData.qty,
          updated_by: user.id
        }, {
          onConflict: 'header_id,catalog_item_id'
        })
        .select()
        .single();

      if (lineError) {
        console.error('Line upsert error:', lineError);
        continue;
      }

      results.push(line);
    }

    return NextResponse.json({ 
      success: true, 
      lines_processed: results.length,
      lines: results 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Bulk upsert error:', error);
    return NextResponse.json({ error: 'Failed to process bulk upsert' }, { status: 500 });
  }
}