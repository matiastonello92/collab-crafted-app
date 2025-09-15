'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, Mail, Activity, Shield, AlertTriangle } from 'lucide-react'

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
      const response = await fetch('/api/v1/admin/dashboard')
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
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="h-8 bg-muted animate-pulse rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-12"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-16 mt-2"></div>
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
              <span className="font-medium">Error loading admin dashboard</span>
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
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Organization management overview
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Org ID: {orgId.slice(0, 8)}...
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.users_total}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.locations_total}</div>
            <p className="text-xs text-muted-foreground">Managed locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tenant.invites_pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      {/* Health & Recent Activity */}
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
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-auto">
              {data.security.audit_recent?.length > 0 ? (
                data.security.audit_recent.slice(0, 5).map((event, i) => (
                  <div key={i} className="flex justify-between items-center p-2 border rounded hover:bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{event.event_key}</span>
                      {event.user_id && (
                        <div className="text-xs text-muted-foreground">
                          User: {event.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/admin/users/invite" 
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Invite User</span>
            </a>
            <a 
              href="/admin/locations/create" 
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Add Location</span>
            </a>
            <a 
              href="/admin/users" 
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Manage Users</span>
            </a>
            <a 
              href="/admin/settings" 
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Settings</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}