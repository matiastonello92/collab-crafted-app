import { NextResponse } from 'next/server'
import { checkOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const { hasAccess, orgId } = await checkOrgAdmin()
    
    if (!hasAccess || !orgId) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()

    // Use org-scoped RPC function
    const { data: dashboardStats, error } = await supabase.rpc('org_dashboard_stats', { p_org_id: orgId })

    if (error) {
      console.error('Org dashboard error:', error)
      return NextResponse.json({ error: 'DATA_ERROR' }, { status: 500 })
    }

    // Get health status
    let healthResponse: { status: string; [key: string]: any } = { status: 'ok' }
    try {
      const healthRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'}/api/healthz`)
      healthResponse = await healthRes.json()
    } catch (error) {
      console.warn('Health check failed:', error)
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
        // TODO: get active plan for this org
        active_plan: null
      },
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}