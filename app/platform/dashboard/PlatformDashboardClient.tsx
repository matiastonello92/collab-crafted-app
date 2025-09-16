'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
        <SectionHeader title="Platform Dashboard" subtitle="Caricamento in corso" />
        <Card className="border-dashed border-muted/60 bg-card/70">
          <CardContent className="space-y-8 p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <SectionHeader title="Platform Dashboard" subtitle="Si è verificato un errore" />
        <Card className="mx-auto max-w-md shadow-card">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">Dashboard non disponibile</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="brand" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const healthStatus = data.ops.health.status?.toUpperCase() ?? 'N/A'
  const healthBadgeClasses = data.ops.health.status === 'ok'
    ? 'border-success/40 bg-success/15 text-success'
    : 'border-destructive/40 bg-destructive/15 text-destructive'

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionHeader
        title="Platform Dashboard"
        subtitle="Global platform oversight and monitoring"
        description="Real-time metrics and insights across all tenants and system operations."
      />

      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/10" />
        <div className="relative space-y-8 p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
            <KpiCard icon={Building2} label="Organizations" value={data.tenant.total_orgs} sub="Active tenants" />
            <KpiCard icon={Users} label="Total Users" value={data.tenant.total_users} sub="All registered" />
            <KpiCard icon={Activity} label="Active Users" value={data.tenant.active_users_30d} sub="Last 30 days" />
            <KpiCard icon={MapPin} label="Locations" value={data.tenant.total_locations} sub="All locations" />
            <KpiCard icon={Mail} label="Pending Invites" value={data.tenant.pending_invites} sub="Awaiting response" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border border-border/70 bg-background/85 shadow-none">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <Shield size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">System Health</CardTitle>
                    <CardDescription>Snapshot del controllo servizi</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={healthBadgeClasses}>
                  {healthStatus}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Ultimo stato</span>
                  <span className="font-medium text-foreground">{healthStatus}</span>
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  {JSON.stringify(data.ops.health, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-background/85 shadow-none">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    <Activity size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Plans Distribution</CardTitle>
                    <CardDescription>Ripartizione per tier</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.plans.plans_by_tier).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-4 py-3">
                    <span className="text-sm capitalize text-muted-foreground">{tier}</span>
                    <span className="text-sm font-semibold text-foreground">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/70 bg-background/85 shadow-none">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent Audit Events</CardTitle>
                <CardDescription>Attività registrate di recente</CardDescription>
              </div>
              <span className="text-xs text-muted-foreground">
                Aggiornato: {lastUpdate?.toLocaleTimeString() ?? 'N/D'}
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.security.audit_recent.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nessun evento recente
                </div>
              ) : (
                data.security.audit_recent.map(event => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/15 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-foreground">{event.event_key}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}