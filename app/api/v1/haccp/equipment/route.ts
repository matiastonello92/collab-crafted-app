import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:view'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = supabase
      .from('haccp_equipment')
      .select('*')
      .order('name', { ascending: true });

    if (locationId) query = query.eq('location_id', locationId);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('equipment_type', type);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching equipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ equipment: data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: hasPermission } = await supabase.rpc('user_has_permission', {
      p_user: user.id,
      p_permission: 'haccp:manage'
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      org_id,
      location_id,
      name,
      equipment_type,
      qr_code,
      nfc_tag,
      min_temp,
      max_temp,
      status
    } = body;

    if (!org_id || !location_id || !name || !equipment_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('haccp_equipment')
      .insert({
        org_id,
        location_id,
        name,
        equipment_type,
        qr_code,
        nfc_tag,
        min_temp,
        max_temp,
        status: status || 'active',
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating equipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ equipment: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
