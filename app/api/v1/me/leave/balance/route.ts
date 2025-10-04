import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all leaves for the current year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).toISOString();
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('start_at, end_at')
      .eq('user_id', user.id)
      .gte('start_at', yearStart)
      .lte('start_at', yearEnd);

    if (leavesError) {
      console.error('Error fetching leaves:', leavesError);
      return NextResponse.json({ error: leavesError.message }, { status: 500 });
    }

    // Calculate days used (simple count of leave records)
    const daysUsed = leaves?.length || 0;

    // Get pending requests
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('leave_requests')
      .select('id, status, start_at, end_at')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching leave requests:', requestsError);
    }

    // Default annual allowance (should come from org settings)
    const annualAllowance = 25;
    const daysAvailable = annualAllowance - daysUsed;

    return NextResponse.json({
      daysAvailable,
      daysUsed,
      annualAllowance,
      pendingRequests: pendingRequests?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
