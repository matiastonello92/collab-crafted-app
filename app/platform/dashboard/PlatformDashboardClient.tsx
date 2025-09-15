'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Building2, Mail, Activity, Shield, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'

interface DashboardData {
  tenant: {
    total_orgs: number
    total_users: number
    active_users_30d: number
    total_locations: number
    pending_invites: number
  }
  security: {
    audit_recent: any[]
    platform_admins: any[]
  }
  ops: {
    health: { status: string; [key: string]: any }
    rate_limit_violations_24h: any[]
    edge_errors_recent: any[]
  }
  plans: {
    plans_by_tier: Record<string, number>
    feature_overrides_count: number
  }
  generated_at: string
}

export function PlatformDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/platform/dashboard', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const newData = await response.json()
      setData(newData)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse rounded-2xl w-80 mb-3"></div>
          <div className="h-5 bg-muted animate-pulse rounded-xl w-64"></div>
        </div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-sm border-0 bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted animate-pulse rounded-lg w-20"></div>
                  <div className="h-5 w-5 bg-muted animate-pulse rounded-lg"></div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-8 bg-muted animate-pulse rounded-lg w-16 mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-md border-0">
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded-lg w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="rounded-2xl shadow-lg border-destructive/50 bg-destructive/5">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchData} variant="outline" className="rounded-xl">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Platform Dashboard
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Global SaaS platform overview and monitoring
              </p>
            </div>
          </div>
          {lastUpdate && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">
                Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
              </p>
              <Button 
                onClick={fetchData}
                variant="ghost" 
                size="sm" 
                className="rounded-xl text-primary hover:bg-primary/10"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.total_orgs}</div>
            <p className="text-xs text-muted-foreground mt-1">Organizations</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.total_users}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active 30d</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.active_users_30d}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly active</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
            <Building2 className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.total_locations}</div>
            <p className="text-xs text-muted-foreground mt-1">Total locations</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
            <Mail className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.pending_invites}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              System Health
              <Badge 
                variant={data.ops.health.status === 'ok' ? 'default' : 'destructive'}
                className="rounded-lg px-3 py-1"
              >
                {data.ops.health.status?.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/50 p-4 rounded-xl overflow-auto max-h-40 font-mono">
              {JSON.stringify(data.ops.health, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Plans Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(data.plans.plans_by_tier).length > 0 ? (
                Object.entries(data.plans.plans_by_tier).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                    <span className="capitalize font-medium">{plan}</span>
                    <Badge variant="secondary" className="rounded-lg px-3 py-1">{count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No plan data available</p>
              )}
              <div className="pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Feature Overrides</span>
                  <Badge variant="outline" className="rounded-lg px-3 py-1">{data.plans.feature_overrides_count}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Events */}
      <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Recent Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.security.audit_recent && data.security.audit_recent.length > 0 ? (
              data.security.audit_recent.slice(0, 10).map((event, i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">{event.event_key}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Org: {event.org_id?.slice(0, 8)}...</span>
                      {event.user_id && <span className="ml-3">User: {event.user_id.slice(0, 8)}...</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent audit events</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}