'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Building2, Mail, Activity, Shield, AlertTriangle, RefreshCw, Plus, Settings, UserPlus } from 'lucide-react'

interface AdminDashboardData {
  tenant: {
    users_total: number
    locations_total: number  
    invites_pending: number
  }
  security: {
    audit_recent: any[]
  }
  ops: {
    health: { status: string; [key: string]: any }
  }
  plans: {
    active_plan: any
  }
  generated_at: string
}

interface Props {
  orgId: string
}

export function AdminDashboardClient({ orgId }: Props) {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const response = await fetch('/api/v1/admin/dashboard', { cache: 'no-store' })
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
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse rounded-2xl w-72 mb-3"></div>
          <div className="h-5 bg-muted animate-pulse rounded-xl w-56 mb-2"></div>
          <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
        </div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-sm border-0 bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted animate-pulse rounded-lg w-24"></div>
                  <div className="h-5 w-5 bg-muted animate-pulse rounded-lg"></div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-8 bg-muted animate-pulse rounded-lg w-16 mb-2"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[...Array(2)].map((_, i) => (
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

        {/* Quick Actions Skeleton */}
        <Card className="rounded-2xl shadow-md border-0">
          <CardHeader>
            <div className="h-6 bg-muted animate-pulse rounded-lg w-28"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card className="rounded-2xl shadow-lg border-destructive/50 bg-destructive/5">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-destructive mb-2">Error Loading Admin Dashboard</h3>
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
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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
                Admin Dashboard
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Organization management and monitoring
              </p>
              <p className="text-xs text-muted-foreground/70 font-mono mt-1">
                Org ID: {orgId.slice(0, 8)}...
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.users_total}</div>
            <p className="text-xs text-muted-foreground mt-1">Active users</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
            <Building2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.locations_total}</div>
            <p className="text-xs text-muted-foreground mt-1">Managed locations</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
            <Mail className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold">{data.tenant.invites_pending}</div>
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
            <pre className="text-xs bg-muted/50 p-4 rounded-xl overflow-auto max-h-32 font-mono">
              {JSON.stringify(data.ops.health, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/90">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-40 overflow-auto">
              {data.security.audit_recent?.length > 0 ? (
                data.security.audit_recent.slice(0, 5).map((event, i) => (
                  <div 
                    key={i} 
                    className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-sm">{event.event_key}</span>
                      {event.user_id && (
                        <div className="text-xs text-muted-foreground mt-1">
                          User: {event.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/admin/users/invite" 
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:shadow-md hover:scale-105 transition-all duration-200"
            >
              <UserPlus className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-medium text-center">Invite User</span>
            </a>
            <a 
              href="/admin/locations/create" 
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:shadow-md hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-6 w-6 text-green-500" />
              <span className="text-sm font-medium text-center">Add Location</span>
            </a>
            <a 
              href="/admin/users" 
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:shadow-md hover:scale-105 transition-all duration-200"
            >
              <Users className="h-6 w-6 text-purple-500" />
              <span className="text-sm font-medium text-center">Manage Users</span>
            </a>
            <a 
              href="/admin/settings" 
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:shadow-md hover:scale-105 transition-all duration-200"
            >
              <Settings className="h-6 w-6 text-orange-500" />
              <span className="text-sm font-medium text-center">Settings</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}