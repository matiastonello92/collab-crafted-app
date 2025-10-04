'use client'

import { useState, useEffect } from 'react'
import { useIsClient } from '@/lib/hydration/HydrationToolkit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Building2, Mail, Activity, Shield, AlertTriangle, RefreshCw, Plus, Settings, UserPlus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const isClient = useIsClient()

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
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="rounded-3xl border border-border/60 bg-muted/30 p-8 shadow-sm">
          <div className="mb-3 h-10 w-72 animate-pulse rounded-2xl bg-muted/70" />
          <div className="mb-2 h-5 w-56 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-3 w-32 animate-pulse rounded-lg bg-muted/50" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm"
            >
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted/70" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm"
            >
              <div className="h-6 w-32 animate-pulse rounded-md bg-muted/70" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
          <div className="mb-4 h-6 w-28 animate-pulse rounded-md bg-muted/70" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Card className="rounded-3xl border border-destructive/50 bg-destructive/10 shadow-sm backdrop-blur">
          <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <AlertTriangle className="size-12 text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">{t('adminDashboard.errorLoading')}</h3>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchData} variant="outline" className="rounded-full">
              <RefreshCw className="mr-2 size-4" />
              {t('adminDashboard.tryAgain')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 py-12 text-center">
        <Shield className="size-16 text-muted-foreground" />
        <p className="text-base text-muted-foreground">{t('adminDashboard.noData')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="grid-bg absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        </div>
        <div className="relative flex flex-col gap-6 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-inner">
              <Shield className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('adminDashboard.title')}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                {t('adminDashboard.subtitle')}
              </p>
              <p className="font-mono text-xs text-muted-foreground/80">
                {t('adminDashboard.orgId')}: {orgId.slice(0, 8)}...
              </p>
            </div>
          </div>
          {isClient && lastUpdate && (
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground lg:items-end">
              <span>
                {t('adminDashboard.updated')} {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
              </span>
              <Button
                onClick={fetchData}
                variant="ghost"
                size="sm"
                className="rounded-full border border-primary/40 text-primary hover:bg-primary/10"
              >
                <RefreshCw className="mr-2 size-4" />
                {t('adminDashboard.refresh')}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="group rounded-2xl border border-border/60 bg-card/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('adminDashboard.teamMembers')}</CardTitle>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold text-foreground">{data.tenant.users_total}</div>
            <p className="text-xs text-muted-foreground">{t('adminDashboard.activeUsers')}</p>
          </CardContent>
        </Card>

        <Card className="group rounded-2xl border border-border/60 bg-card/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('adminDashboard.locations')}</CardTitle>
            <div className="rounded-full bg-green-500/10 p-2 text-green-500">
              <Building2 className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold text-foreground">{data.tenant.locations_total}</div>
            <p className="text-xs text-muted-foreground">{t('adminDashboard.managedLocations')}</p>
          </CardContent>
        </Card>

        <Card className="group rounded-2xl border border-border/60 bg-card/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('adminDashboard.pendingInvites')}</CardTitle>
            <div className="rounded-full bg-orange-500/10 p-2 text-orange-500">
              <Mail className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-semibold text-foreground">{data.tenant.invites_pending}</div>
            <p className="text-xs text-muted-foreground">{t('adminDashboard.awaitingAcceptance')}</p>
          </CardContent>
        </Card>
      </section>

      {/* Secondary Cards */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              {t('adminDashboard.systemHealth')}
              <Badge
                variant={data.ops.health.status === 'ok' ? 'default' : 'destructive'}
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              >
                {data.ops.health.status?.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto rounded-2xl border border-border/50 bg-muted/40 p-4 text-xs font-mono">
              {JSON.stringify(data.ops.health, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{t('adminDashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.security.audit_recent?.length > 0 ? (
                data.security.audit_recent.slice(0, 5).map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm shadow-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-foreground">{event.event_key}</span>
                      {event.user_id && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          User: {event.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {isClient ? new Date(event.created_at).toLocaleString() : '—'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <Activity className="size-8" />
                  <p>{t('adminDashboard.noActivity')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <Card className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{t('adminDashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <a
              href="/admin/users/invite"
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-6 text-center text-sm font-medium shadow-sm transition-transform hover:-translate-y-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <UserPlus className="size-6 text-blue-500" />
              <span>{t('adminDashboard.inviteUser')}</span>
            </a>
            <a
              href="/admin/locations/create"
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-6 text-center text-sm font-medium shadow-sm transition-transform hover:-translate-y-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus className="size-6 text-green-500" />
              <span>{t('adminDashboard.addLocation')}</span>
            </a>
            <a
              href="/admin/users"
              className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-6 text-center text-sm font-medium shadow-sm transition-transform hover:-translate-y-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Users className="size-6 text-purple-500" />
              <span>{t('adminDashboard.manageUsers')}</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}