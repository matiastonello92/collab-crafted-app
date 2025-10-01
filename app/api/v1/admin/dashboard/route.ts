import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/admin/dashboard called')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id)

    // Derive org_id from user's membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership?.org_id) {
      console.log('❌ [API DEBUG] No membership found')
      return NextResponse.json({ error: 'No organization' }, { status: 400 })
    }

    const orgId = membership.org_id
    console.log('✅ [API DEBUG] Derived org_id:', orgId)

    // Use org-scoped RPC function (RLS enforced)
    const { data: dashboardStats, error } = await supabase.rpc('org_dashboard_stats', { p_org_id: orgId })

    if (error) {
      console.error('❌ [API DEBUG] RPC error:', error)
      return NextResponse.json({ error: 'DATA_ERROR' }, { status: 500 })
    }

    console.log('✅ [API DEBUG] Dashboard stats fetched')

    // Get health status
    let healthResponse: { status: string; [key: string]: any } = { status: 'ok' }
    try {
      const healthRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/api/healthz`)
      healthResponse = await healthRes.json()
    } catch (error) {
      console.warn('⚠️ [API DEBUG] Health check failed:', error)
      healthResponse = { status: 'error', error: 'Health check failed' }
    }

    return NextResponse.json({
      tenant: {
        users_total: dashboardStats?.users_total || 0,
        locations_total: dashboardStats?.locations_total || 0,
        invites_pending: dashboardStats?.invites_pending || 0
      },
      security: {
        audit_recent: dashboardStats?.audit_recent || []
      },
      ops: {
        health: healthResponse
      },
      plans: {
        active_plan: null
      },
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ [API DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
