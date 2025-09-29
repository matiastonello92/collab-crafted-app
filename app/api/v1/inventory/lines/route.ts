import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const updateLineSchema = z.object({
  qty: z.number().min(0),
  unit_price_snapshot: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerId = searchParams.get('header_id');

    if (!headerId) {
      return NextResponse.json({ error: 'header_id is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: lines, error } = await supabase
      .from('inventory_lines')
      .select(`
        *,
        catalog_item:catalog_item_id(*)
      `)
      .eq('header_id', headerId)
      .order('name_snapshot');

    if (error) {
      console.error('Error fetching inventory lines:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lines });
  } catch (error) {
    console.error('Error in lines GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('id');

    if (!lineId) {
      return NextResponse.json({ error: 'Line ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateLineSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    
    // Get current line to get unit_price_snapshot if not provided
    const { data: currentLine, error: fetchError } = await supabase
      .from('inventory_lines')
      .select('unit_price_snapshot')
      .eq('id', lineId)
      .single();

    if (fetchError || !currentLine) {
      console.error('Error fetching current line:', fetchError);
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    // Calculate line_value manually
    const unitPrice = validated.unit_price_snapshot ?? currentLine.unit_price_snapshot;
    const lineValue = validated.qty * unitPrice;

    // Update line with calculated line_value
    // The database trigger will automatically update header total_value
    const { data: line, error } = await supabase
      .from('inventory_lines')
      .update({
        ...validated,
        line_value: lineValue,
      })
      .eq('id', lineId)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory line:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ line });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in lines PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { header_id, catalog_item_id } = body;

    if (!header_id || !catalog_item_id) {
      return NextResponse.json(
        { error: 'header_id and catalog_item_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    // Get catalog item details
    const { data: catalogItem, error: catalogError } = await supabase
      .from('inventory_catalog_items')
      .select('*')
      .eq('id', catalog_item_id)
      .single();

    if (catalogError || !catalogItem) {
      return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 });
    }

    // Get header details for org_id and location_id
    const { data: header, error: headerError } = await supabase
      .from('inventory_headers')
      .select('org_id, location_id')
      .eq('id', header_id)
      .single();

    if (headerError || !header) {
      return NextResponse.json({ error: 'Header not found' }, { status: 404 });
    }

    // Calculate initial line_value
    const initialQty = 0;
    const initialLineValue = initialQty * catalogItem.default_unit_price;

    const { data: line, error } = await supabase
      .from('inventory_lines')
      .insert({
        org_id: header.org_id,
        location_id: header.location_id,
        header_id,
        catalog_item_id,
        name_snapshot: catalogItem.name,
        uom_snapshot: catalogItem.uom,
        unit_price_snapshot: catalogItem.default_unit_price,
        qty: initialQty,
        line_value: initialLineValue,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory line:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ line }, { status: 201 });
  } catch (error) {
    console.error('Error in lines POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get('id');

    if (!lineId) {
      return NextResponse.json({ error: 'Line ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('inventory_lines')
      .delete()
      .eq('id', lineId);

    if (error) {
      console.error('Error deleting inventory line:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in lines DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}