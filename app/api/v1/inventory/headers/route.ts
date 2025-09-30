import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { z } from 'zod';

const createHeaderSchema = z.object({
  location_id: z.string().uuid(),
  category: z.enum(['kitchen', 'bar', 'cleaning']),
  notes: z.string().optional(),
});

const updateHeaderSchema = z.object({
  status: z.enum(['in_progress', 'completed', 'approved']).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] Headers GET route called');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const id = searchParams.get('id');
    const limit = searchParams.get('limit') || '50';

    console.log('🔍 [API DEBUG] Query params:', {
      locationId,
      category,
      status,
      id,
      limit
    });

    const supabase = await createSupabaseServerClient();
    console.log('🔍 [API DEBUG] Supabase client created');

    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 [API DEBUG] Auth check:', {
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });

    if (!user) {
      console.error('❌ [API DEBUG] No authenticated user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let query = supabase
      .from('inventory_headers')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));

    if (id) query = query.eq('id', id);
    if (locationId) query = query.eq('location_id', locationId);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    console.log('🔍 [API DEBUG] About to execute query...');
    const { data: headers, error } = await query;

    console.log('🔍 [API DEBUG] Query result:', {
      headersCount: headers?.length || 0,
      error: error?.message,
      firstHeader: headers?.[0] ? {
        id: headers[0].id,
        category: headers[0].category,
        status: headers[0].status,
        org_id: headers[0].org_id,
        location_id: headers[0].location_id
      } : null
    });

    if (error) {
      console.error('❌ [API DEBUG] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ [API DEBUG] Returning headers:', headers?.length || 0, 'items');
    return NextResponse.json(headers);
  } catch (error) {
    console.error('❌ [API DEBUG] Exception in headers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createHeaderSchema.parse(body);

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

    // Allow multiple in-progress inventories (removed blocking check)

    const { data: header, error } = await supabase
      .from('inventory_headers')
      .insert({
        ...validated,
        org_id: location.org_id,
        started_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory header:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-populate with catalog items
    const { data: catalogItems } = await supabase
      .from('inventory_catalog_items')
      .select('*')
      .eq('org_id', location.org_id)
      .eq('location_id', validated.location_id)
      .eq('category', validated.category)
      .eq('is_active', true);

    if (catalogItems && catalogItems.length > 0) {
      const lines = catalogItems.map((item: any) => ({
        org_id: location.org_id,
        location_id: validated.location_id,
        header_id: header.id,
        catalog_item_id: item.id,
        name_snapshot: item.name,
        uom_snapshot: item.uom,
        unit_price_snapshot: item.default_unit_price,
        qty: 0,
      }));

      await supabase.from('inventory_lines').insert(lines);
    }

    return NextResponse.json({ header }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in headers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerId = searchParams.get('id');

    if (!headerId) {
      return NextResponse.json({ error: 'Header ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateHeaderSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let updateData: any = validated;

    // If approving, set approval fields
    if (validated.status === 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { data: header, error } = await supabase
      .from('inventory_headers')
      .update(updateData)
      .eq('id', headerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating inventory header:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ header });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in headers PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const headerId = searchParams.get('id');

    if (!headerId) {
      return NextResponse.json({ error: 'Header ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get header to verify it exists
    const { data: header, error: fetchError } = await supabase
      .from('inventory_headers')
      .select('*')
      .eq('id', headerId)
      .single();

    if (fetchError || !header) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    // Delete associated inventory_lines first
    await supabase
      .from('inventory_lines')
      .delete()
      .eq('header_id', headerId);

    // Delete the header
    const { error: deleteError } = await supabase
      .from('inventory_headers')
      .delete()
      .eq('id', headerId);

    if (deleteError) {
      console.error('Error deleting inventory header:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in headers DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}