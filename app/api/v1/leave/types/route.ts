import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerActionClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's org_id from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.org_id) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    )
  }

  // Fetch leave types for user's organization (RLS enforced)
  const { data: leaveTypes, error: typesError } = await supabase
    .from('leave_types')
    .select('id, key, label, color, requires_approval, is_active')
    .eq('org_id', profile.org_id)
    .eq('is_active', true)
    .order('label')

  if (typesError) {
    console.error('Error fetching leave types:', typesError)
    return NextResponse.json(
      { error: typesError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ leaveTypes: leaveTypes || [] })
}
