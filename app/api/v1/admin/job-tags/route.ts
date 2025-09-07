import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId, hasAccess } = await checkAdminAccess()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Fetch active job tags
    const { data: jobTags, error } = await supabase
      .from('job_tags')
      .select('id, name, label, is_active')
      .eq('is_active', true)
      .order('label')

    if (error) {
      console.error('Error fetching job tags:', error)
      return NextResponse.json({ error: 'Failed to fetch job tags' }, { status: 500 })
    }

    return NextResponse.json({ jobTags })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}