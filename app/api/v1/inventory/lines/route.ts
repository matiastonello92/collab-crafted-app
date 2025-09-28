import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
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

    const supabase = createSupabaseAdminClient();
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

    const supabase = createSupabaseAdminClient();
    const { data: line, error } = await supabase
      .from('inventory_lines')
      .update(validated)
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

    const supabase = createSupabaseAdminClient();
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
        qty: 0,
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

    const supabase = createSupabaseAdminClient();
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