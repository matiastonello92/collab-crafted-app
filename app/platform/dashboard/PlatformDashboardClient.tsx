'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Mail, Activity, Shield, AlertTriangle } from 'lucide-react'

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
      const response = await fetch('/api/platform/dashboard')
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
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <div>
            <div className="h-8 bg-muted animate-pulse rounded w-64 mb-2"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error loading dashboard</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Platform Dashboard</h1>
            <p className="text-muted-foreground">
              Global SaaS platform overview
            </p>
          </div>
        </div>
        {lastUpdate && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
            </p>
            <button 
              onClick={fetchData}
              className="text-xs text-primary hover:underline"
            >
              Refresh now
            </button>
          </div>
        )}
      </div>

      {/* Tenant Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.total_orgs}</div>
            <p className="text-xs text-muted-foreground">Organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.total_users}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active 30d</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.active_users_30d}</div>
            <p className="text-xs text-muted-foreground">Monthly active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.total_locations}</div>
            <p className="text-xs text-muted-foreground">Total locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.pending_invites}</div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      {/* Health & Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              System Health
              <Badge variant={data.ops.health.status === 'ok' ? 'default' : 'destructive'}>
                {data.ops.health.status?.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32">
              {JSON.stringify(data.ops.health, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plans Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.keys(data.plans.plans_by_tier).length > 0 ? (
                Object.entries(data.plans.plans_by_tier).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center">
                    <span className="capitalize font-medium">{plan}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No plan data available</p>
              )}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Feature Overrides</span>
                  <Badge variant="outline">{data.plans.feature_overrides_count}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.security.audit_recent && data.security.audit_recent.length > 0 ? (
              data.security.audit_recent.slice(0, 10).map((event, i) => (
                <div key={i} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <span className="font-medium">{event.event_key}</span>
                    <div className="text-sm text-muted-foreground">
                      <span>Org: {event.org_id?.slice(0, 8)}...</span>
                      {event.user_id && <span className="ml-2">User: {event.user_id.slice(0, 8)}...</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent audit events
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}