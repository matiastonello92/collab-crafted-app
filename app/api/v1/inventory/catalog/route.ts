import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createCatalogItemSchema = z.object({
  location_id: z.string().uuid(),
  category: z.enum(['kitchen', 'bar', 'cleaning']),
  name: z.string().min(1),
  uom: z.string().min(1),
  default_unit_price: z.number().min(0),
  supplier_id: z.string().uuid().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

const updateCatalogItemSchema = createCatalogItemSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const category = searchParams.get('category');
    const orgId = searchParams.get('org_id');

    if (!locationId || !category || !orgId) {
      return NextResponse.json(
        { error: 'location_id, category, and org_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: items, error } = await supabase
      .from('inventory_catalog_items')
      .select('*')
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .eq('category', category)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching catalog items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in catalog GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCatalogItemSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    // Get user's org_id from session or context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from user's profile or membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'User org not found' }, { status: 403 });
    }

    const { data: item, error } = await supabase
      .from('inventory_catalog_items')
      .insert({
        ...validated,
        org_id: profile.org_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating catalog item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in catalog POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateCatalogItemSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: item, error } = await supabase
      .from('inventory_catalog_items')
      .update(validated)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating catalog item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in catalog PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('inventory_catalog_items')
      .update({ is_active: false })
      .eq('id', itemId);

    if (error) {
      console.error('Error deactivating catalog item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in catalog DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}