'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, Flag, Database, Settings, Activity } from 'lucide-react'
import Link from 'next/link'
import { DataProvider, useDataContext } from '@/components/performance/DataSeparation'
import { SmartLoadingSkeleton } from '@/components/performance/SmartLoading'
import { RouteOptimizer } from '@/components/performance/RouteOptimization'
import { EnhancedErrorBoundary } from '@/components/error-boundary-enhanced'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'
import { useLocationContext } from '@/lib/store/modernized'

interface DashboardData {
  stats: {
    activeUsers: number
    locations: number
    featureFlags: number
    permissions: number
  }
  systemStatus: Array<{
    service: string
    status: 'operational' | 'warning' | 'error'
    message: string
  }>
  metadata: {
    sources: string[]
    lastUpdate: Date
    confidence: number
    healthResponseTime: number
  }
}

// Enterprise-grade data fetcher with fallback chain and aggregation
async function fetchDashboardData(): Promise<DashboardData> {
  const { StatsNormalizer } = await import('@/lib/data/stats-normalizer')
  const { ServiceHealthAggregator } = await import('@/lib/data/health-aggregator')
  
  // Parallel execution of normalized stats and health aggregation
  const [normalizedStats, aggregatedHealth] = await Promise.allSettled([
    StatsNormalizer.normalizeStats().catch(error => {
      console.warn('[Dashboard] Stats normalization failed:', error)
      return {
        stats: { activeUsers: 0, locations: 0, featureFlags: 0, permissions: 0 },
        metadata: { sources: [], lastUpdate: new Date(), confidence: 0 }
      }
    }),
    ServiceHealthAggregator.aggregateHealth().catch(error => {
      console.warn('[Dashboard] Health aggregation failed:', error)
      return {
        services: [{ service: 'System', status: 'error' as const, message: 'Health check failed' }],
        overallStatus: 'error' as const,
        lastCheck: new Date(),
        metadata: { endpoints: [], failedEndpoints: [], responseTime: 0 }
      }
    })
  ])

  // Extract results with type safety
  const statsResult = normalizedStats.status === 'fulfilled' ? normalizedStats.value : {
    stats: { activeUsers: 0, locations: 0, featureFlags: 0, permissions: 0 },
    metadata: { sources: [], lastUpdate: new Date(), confidence: 0 }
  }
  
  const healthResult = aggregatedHealth.status === 'fulfilled' ? aggregatedHealth.value : {
    services: [{ service: 'System', status: 'error' as const, message: 'Health check failed' }],
    overallStatus: 'error' as const,
    lastCheck: new Date(),
    metadata: { endpoints: [], failedEndpoints: [], responseTime: 0 }
  }

  return {
    stats: statsResult.stats,
    systemStatus: healthResult.services,
    metadata: {
      sources: [...statsResult.metadata.sources, ...healthResult.metadata.endpoints],
      lastUpdate: new Date(Math.max(
        statsResult.metadata.lastUpdate.getTime(),
        healthResult.lastCheck.getTime()
      )),
      confidence: statsResult.metadata.confidence,
      healthResponseTime: healthResult.metadata.responseTime
    }
  }
}

function DashboardContent() {
  const { data } = useDataContext<DashboardData>()
  const { permissions } = usePermissions()
  const { location_name } = useLocationContext()
  
  const quickActions = [
    {
      title: 'Gestisci Utenti',
      description: 'Amministra utenti e permessi',
      href: '/admin/users',
      icon: Users,
      permission: 'manage_users'
    },
    {
      title: 'Feature Flags',
      description: 'Configura funzionalità per moduli',
      href: '/admin/feature-flags',
      icon: Flag,
      permission: 'flags:view'
    },
    {
      title: 'Impostazioni',
      description: 'Configurazioni generali',
      href: '/settings',
      icon: Settings,
      permission: 'view_settings'
    }
  ]

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Route optimization */}
      <RouteOptimizer 
        prefetchRoutes={['/admin/users', '/admin/feature-flags', '/settings']}
        prefetchData={[
          {
            key: 'users-preview',
            fetcher: () => fetch('/api/v1/admin/users?limit=5').then(r => r.json())
          }
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-klyra-primary to-klyra-accent bg-clip-text text-transparent">
            Klyra Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Piattaforma avanzata per la gestione del personale multi-location
          </p>
          {location_name && (
            <div className="flex gap-2 mt-4">
              <Badge variant="outline" className="border-klyra-primary/30 text-klyra-primary">
                Location: {location_name}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-klyra-success" />
          <span className="text-sm text-muted-foreground">Sistema Operativo</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utenti Attivi</p>
                <p className="text-2xl font-bold">{data.stats.activeUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">Utenti registrati</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Locations</p>
                <p className="text-2xl font-bold">{data.stats.locations}</p>
                <p className="text-xs text-muted-foreground mt-1">Sedi operative</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Feature Flags</p>
                <p className="text-2xl font-bold">{data.stats.featureFlags}</p>
                <p className="text-xs text-muted-foreground mt-1">Flags configurati</p>
              </div>
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permessi</p>
                <p className="text-2xl font-bold">{data.stats.permissions}</p>
                <p className="text-xs text-muted-foreground mt-1">Permessi configurati</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Accedi rapidamente alle funzioni principali del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const canAccess = checkPermission(permissions, action.permission)
              
              return (
                <Card key={index} className={!canAccess ? 'opacity-50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <action.icon className="h-6 w-6" />
                      <h3 className="font-semibold">{action.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {action.description}
                    </p>
                    {canAccess ? (
                      <Button asChild className="w-full" variant="default">
                        <Link href={action.href}>Accedi</Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full">Accesso Negato</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status with Enhanced Error Handling */}
      <EnhancedErrorBoundary level="section">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Stato del Sistema
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  data.systemStatus.every(s => s.status === 'operational') ? 'bg-klyra-success' :
                  data.systemStatus.some(s => s.status === 'error') ? 'bg-destructive' : 'bg-klyra-warning'
                }`} />
                <Badge variant="outline" className="text-xs">
                  Confidence: {Math.round(data.metadata.confidence * 100)}%
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Monitoraggio aggregato dei servizi principali • 
              Aggiornato: {data.metadata.lastUpdate.toLocaleTimeString()} • 
              Tempo risposta: {data.metadata.healthResponseTime.toFixed(0)}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.systemStatus && data.systemStatus.length > 0 ? (
                data.systemStatus.map((service, index) => (
                  <div key={`${service.service}-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        service.status === 'operational' ? 'bg-klyra-success' :
                        service.status === 'warning' ? 'bg-klyra-warning' : 'bg-destructive'
                      }`} />
                      <span className="font-medium">{service.service}</span>
                    </div>
                    <Badge variant={service.status === 'operational' ? 'secondary' : 'outline'}>
                      {service.message}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mr-2" />
                  <span>Nessun dato di sistema disponibile</span>
                </div>
              )}
            </div>
            
            {/* Metadata for debugging in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Debug Info</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify({
                    sources: data.metadata.sources,
                    confidence: data.metadata.confidence,
                    responseTime: data.metadata.healthResponseTime
                  }, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </EnhancedErrorBoundary>
    </div>
  )
}

export default function DashboardClient() {
  return (
    <EnhancedErrorBoundary 
      level="page"
      onError={(error, errorInfo) => {
        // Send to monitoring service in production
        console.error('[Dashboard] Page-level error:', { error, errorInfo })
      }}
    >
      <DataProvider
        cacheKey="dashboard-data-v2" // Updated cache key for new data structure
        fetcher={fetchDashboardData}
        fallback={<SmartLoadingSkeleton variant="dashboard" />}
      >
        <DashboardContent />
      </DataProvider>
    </EnhancedErrorBoundary>
  )
}