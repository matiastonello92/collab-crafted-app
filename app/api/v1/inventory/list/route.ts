import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const category = searchParams.get('category');

    if (!locationId || !category) {
      return NextResponse.json(
        { error: 'Missing required parameters: location_id, category' },
        { status: 400 }
      );
    }

    // Fetch all inventories for this location and category
    const { data, error } = await supabase
      .from('inventory_headers')
      .select('*')
      .eq('location_id', locationId)
      .eq('category', category)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching inventories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Unexpected error in GET /api/v1/inventory/list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
