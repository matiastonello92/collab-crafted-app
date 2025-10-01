import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

/**
 * POST /api/v1/admin/job-tags/preset
 * Inserisce set consigliato ristorazione (idempotente)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API DEBUG] POST /api/v1/admin/job-tags/preset called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

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
