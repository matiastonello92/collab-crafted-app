'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin, Settings, UserPlus, Building2, Shield, Activity } from 'lucide-react'
import Link from 'next/link'
import { usePermissions } from '@/hooks/usePermissions'
import { useLocationContext } from '@/lib/store/unified'
import { checkPermission } from '@/lib/permissions/unified'

export default function DashboardClient() {
  const { permissions } = usePermissions()
  const { location_name } = useLocationContext()

  // Simple permission checks using unified checker
  const canManageUsers = checkPermission(permissions, 'users:manage')
  const canManageLocations = checkPermission(permissions, 'locations:manage')
  const canViewAdmin = checkPermission(permissions, 'admin:access')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Benvenuto nella tua dashboard
            {location_name && <span> • {location_name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <Badge variant="secondary">Sistema Operativo</Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Azioni Rapide
          </CardTitle>
          <CardDescription>
            Accedi rapidamente alle funzionalità principali della piattaforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canManageUsers && (
              <Link href="/admin/users/invite">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <UserPlus className="w-6 h-6" />
                  <span>Invita Utente</span>
                </Button>
              </Link>
            )}
            
            {canManageLocations && (
              <Link href="/admin/locations">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Building2 className="w-6 h-6" />
                  <span>Gestisci Sedi</span>
                </Button>
              </Link>
            )}

            {canViewAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <Shield className="w-6 h-6" />
                  <span>Pannello Admin</span>
                </Button>
              </Link>
            )}

            <Link href="/me">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="w-6 h-6" />
                <span>Il Mio Profilo</span>
              </Button>
            </Link>

            <Link href="/locations/manage">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <MapPin className="w-6 h-6" />
                <span>Le Mie Sedi</span>
              </Button>
            </Link>

            <Link href="/settings">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Settings className="w-6 h-6" />
                <span>Impostazioni</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Simple Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stato Sistema</CardTitle>
          <CardDescription>
            Tutti i servizi sono operativi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">Sistema operativo</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}