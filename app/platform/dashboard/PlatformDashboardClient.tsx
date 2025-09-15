'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Building2, 
  MapPin, 
  Mail,
  Activity,
  AlertTriangle,
  RefreshCw,
  Shield
} from 'lucide-react'
import { SectionHeader } from '@/components/platform/SectionHeader'
import { KpiCard } from '@/components/platform/KpiCard'
import { SkeletonCard } from '@/components/platform/SkeletonCard'

interface DashboardData {
  tenant: {
    total_orgs: number
    total_users: number
    active_users_30d: number
    total_locations: number
    pending_invites: number
  }
  security: {
    audit_recent: Array<{
      id: string
      event_key: string
      org_id: string | null
      user_id: string
      timestamp: string
      metadata: any
    }>
  }
  ops: {
    health: {
      status: string
      [key: string]: any
    }
  }
  plans: {
    plans_by_tier: Record<string, number>
    feature_overrides_count: number
  }
}

export function PlatformDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      setError(null)
      const res = await fetch('/api/platform/dashboard', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const result = await res.json()
      setData(result)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <SectionHeader title="Platform Dashboard" subtitle="Loading..." />
        <div className="relative">
          <div className="absolute inset-0 bg-radial opacity-60"></div>
          <div className="relative grid-bg rounded-3xl p-8 border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <SectionHeader title="Platform Dashboard" subtitle="Error occurred" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="platform-card max-w-md w-full p-8 text-center space-y-6">
            <AlertTriangle className="w-8 h-8 mx-auto text-klyra-danger" />
            <div>
              <h3 className="text-xl font-semibold text-klyra-fg">Dashboard Error</h3>
              <p className="text-klyra-muted">{error}</p>
            </div>
            <Button onClick={fetchData} className="bg-klyra-primary hover:bg-klyra-primary-600 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader 
        title="Platform Dashboard"
        subtitle="Global platform oversight and monitoring"
        description="Real-time metrics and insights across all tenants and system operations."
      />

      <div className="relative">
        <div className="absolute inset-0 bg-radial opacity-60 rounded-3xl"></div>
        <div className="relative grid-bg rounded-3xl p-8 border border-white/5 backdrop-blur-sm">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <KpiCard icon={Building2} label="Organizations" value={data.tenant.total_orgs} sub="Active tenants" />
            <KpiCard icon={Users} label="Total Users" value={data.tenant.total_users} sub="All registered" />
            <KpiCard icon={Activity} label="Active Users" value={data.tenant.active_users_30d} sub="Last 30 days" />
            <KpiCard icon={MapPin} label="Locations" value={data.tenant.total_locations} sub="All locations" />
            <KpiCard icon={Mail} label="Pending Invites" value={data.tenant.pending_invites} sub="Awaiting response" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="platform-card glow-ring p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-klyra-primary to-klyra-accent p-2 flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-klyra-fg">System Health</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-klyra-muted">Status</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    data.ops.health.status === 'ok' 
                      ? 'bg-klyra-success/20 text-klyra-success border border-klyra-success/30'
                      : 'bg-klyra-danger/20 text-klyra-danger border border-klyra-danger/30'
                  }`}>
                    {data.ops.health.status.toUpperCase()}
                  </span>
                </div>
                <pre className="text-xs bg-klyra-surface/40 p-3 rounded-lg border border-klyra-border/50 overflow-auto max-h-20 text-klyra-subtle">
                  {JSON.stringify(data.ops.health, null, 2)}
                </pre>
              </div>
            </div>

            <div className="platform-card glow-ring p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-klyra-primary to-klyra-accent p-2 flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-klyra-fg">Plans Distribution</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(data.plans.plans_by_tier).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <span className="text-sm text-klyra-muted capitalize">{tier}</span>
                    <span className="text-sm font-semibold text-klyra-fg">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="platform-card glow-ring p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-klyra-fg">Recent Audit Events</h3>
              <span className="text-xs text-klyra-subtle">
                Updated: {lastUpdate?.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-auto">
              {data.security.audit_recent.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto text-klyra-subtle mb-2" />
                  <p className="text-sm text-klyra-muted">No recent audit events</p>
                </div>
              ) : (
                data.security.audit_recent.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-klyra-surface/30 border border-klyra-border/50">
                    <span className="text-sm font-medium text-klyra-fg">{event.event_key}</span>
                    <span className="text-xs text-klyra-subtle">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}