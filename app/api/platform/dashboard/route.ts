import { NextResponse } from 'next/server'
import { checkPlatformAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const { hasAccess } = await checkPlatformAdmin()
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 })
    }

    const supabase = await createSupabaseServerClient()

    // Use RPC functions for cross-tenant data
    const [
      { data: orgCounts },
      { data: plansOverview },
      { data: auditRecent }
    ] = await Promise.all([
      supabase.rpc('platform_org_counts'),
      supabase.rpc('platform_plans_overview'),
      supabase.rpc('platform_audit_recent', { p_limit: 10 })
    ])

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
      tenant: orgCounts || {
        total_orgs: 0,
        total_users: 0,
        active_users_30d: 0,
        total_locations: 0,
        pending_invites: 0
      },
      security: {
        audit_recent: auditRecent || [],
        platform_admins: [] // TODO: implement if needed
      },
      ops: {
        health: healthResponse,
        rate_limit_violations_24h: [], // TODO: implement if needed
        edge_errors_recent: []
      },
      plans: plansOverview || {
        plans_by_tier: {},
        feature_overrides_count: 0
      },
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Platform dashboard error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}