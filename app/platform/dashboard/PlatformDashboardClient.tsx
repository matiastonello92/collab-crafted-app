'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()
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
        <SectionHeader title={t('platform.dashboard.title')} subtitle={t('platform.dashboard.loading')} />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-60"></div>
          <div className="relative grid-bg rounded-3xl p-8 border border-border/50 backdrop-blur-sm">
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
        <SectionHeader title={t('platform.dashboard.title')} subtitle={t('platform.dashboard.error')} />
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md rounded-3xl border-border/60 bg-card/90 text-center shadow-lg shadow-primary/10">
            <CardContent className="space-y-6 p-8">
              <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">{t('platform.dashboard.error')}</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchData} className="mx-auto inline-flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('platform.dashboard.retry')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader 
        title={t('platform.dashboard.title')}
        subtitle={t('platform.dashboard.subtitle')}
        description={t('platform.dashboard.description')}
      />

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-60 rounded-3xl"></div>
        <div className="relative grid-bg rounded-3xl p-8 border border-border/50 backdrop-blur-sm">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <KpiCard icon={Building2} label="Organizations" value={data.tenant.total_orgs} sub="Active tenants" />
            <KpiCard icon={Users} label="Total Users" value={data.tenant.total_users} sub="All registered" />
            <KpiCard icon={Activity} label="Active Users" value={data.tenant.active_users_30d} sub="Last 30 days" />
            <KpiCard icon={MapPin} label="Locations" value={data.tenant.total_locations} sub="All locations" />
            <KpiCard icon={Mail} label="Pending Invites" value={data.tenant.pending_invites} sub="Awaiting response" />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border-border/60 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <Shield size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t('platform.dashboard.systemHealth')}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('platform.dashboard.status')}</span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        data.ops.health.status === 'ok'
                          ? 'border-klyra-success/30 bg-klyra-success/15 text-klyra-success'
                          : 'border-destructive/30 bg-destructive/15 text-destructive'
                      }`}
                    >
                      {data.ops.health.status.toUpperCase()}
                    </span>
                  </div>
                  <pre className="max-h-20 overflow-auto rounded-lg border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(data.ops.health, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/60 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <Activity size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t('platform.dashboard.plansDistribution')}</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(data.plans.plans_by_tier).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-muted-foreground">{tier}</span>
                      <span className="text-sm font-semibold text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-border/60 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t('platform.dashboard.recentAuditEvents')}</h3>
                <span className="text-xs text-muted-foreground">
                  {t('platform.dashboard.updated')}: {lastUpdate?.toLocaleTimeString()}
                </span>
              </div>

              <div className="max-h-64 space-y-2 overflow-auto">
                {data.security.audit_recent.length === 0 ? (
                  <div className="py-8 text-center">
                    <Activity className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('platform.dashboard.noRecentEvents')}</p>
                  </div>
                ) : (
                  data.security.audit_recent.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{event.event_key}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}