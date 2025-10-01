import { NextRequest, NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * POST /api/v1/admin/job-tags/preset
 * Inserisce set consigliato ristorazione (idempotente)
 */
export async function POST(request: NextRequest) {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()

    // Call RPC function
    const { data, error } = await supabase.rpc('insert_preset_ristorazione_tags', {
      p_org_id: orgId
    })

    if (error) {
      console.error('Error inserting preset tags:', error)
      return NextResponse.json({ error: 'Failed to insert preset tags' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
