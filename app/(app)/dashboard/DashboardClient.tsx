'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, Flag, Database, Settings, Activity } from 'lucide-react'
import Link from 'next/link'
import { DataProvider, useDataContext } from '@/components/performance/DataSeparation'
import { SmartLoadingSkeleton } from '@/components/performance/SmartLoading'
import { RouteOptimizer } from '@/components/performance/RouteOptimization'
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
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [statsRes, statusRes] = await Promise.all([
    fetch('/api/platform/dashboard'),
    fetch('/api/health')
  ])
  
  const stats = await statsRes.json()
  const systemStatus = await statusRes.json()
  
  return { stats, systemStatus }
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

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato del Sistema</CardTitle>
          <CardDescription>Monitoraggio dei servizi principali</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.systemStatus.map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    service.status === 'operational' ? 'bg-klyra-success' :
                    service.status === 'warning' ? 'bg-klyra-warning' : 'bg-destructive'
                  }`} />
                  <span>{service.service}</span>
                </div>
                <Badge variant={service.status === 'operational' ? 'secondary' : 'outline'}>
                  {service.message}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardClient() {
  return (
    <DataProvider
      cacheKey="dashboard-data"
      fetcher={fetchDashboardData}
      fallback={<SmartLoadingSkeleton variant="dashboard" />}
    >
      <DashboardContent />
    </DataProvider>
  )
}