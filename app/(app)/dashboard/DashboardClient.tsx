'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin, Settings, UserPlus, Building2, Shield, Activity } from 'lucide-react'
import Link from 'next/link'

export default function DashboardClient() {
  const [mounted, setMounted] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [location_name, setLocationName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle hydration and load permissions
  useEffect(() => {
    setMounted(true)
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Load permissions
      const permResponse = await fetch('/api/v1/me/permissions', {
        credentials: 'include'
      })
      if (permResponse.ok) {
        const permData = await permResponse.json()
        setPermissions(permData.permissions || [])
      }

      // Load location context (if available)
      try {
        const contextResponse = await fetch('/api/v1/me/context', {
          credentials: 'include'
        })
        if (contextResponse.ok) {
          const contextData = await contextResponse.json()
          setLocationName(contextData.location_name)
        }
      } catch (contextError) {
        console.warn('Context not available:', contextError)
      }

    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Simple permission checker
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false
    if (permissions.includes('*')) return true // Admin wildcard
    
    // Direct match
    if (permissions.includes(permission)) return true
    
    // Module wildcard (e.g., 'users:*' covers 'users:manage')
    const [module] = permission.split(':')
    if (module && permissions.includes(`${module}:*`)) return true
    
    return false
  }

  // Show loading state during hydration
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const canManageUsers = hasPermission('users:manage')
  const canManageLocations = hasPermission('locations:manage')
  const canViewAdmin = hasPermission('admin:access') || hasPermission('*')

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

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <div>Permissions: {permissions.length > 0 ? permissions.join(', ') : 'None'}</div>
            <div>Location: {location_name || 'Not set'}</div>
            <div>Can Manage Users: {canManageUsers ? 'Yes' : 'No'}</div>
            <div>Can View Admin: {canViewAdmin ? 'Yes' : 'No'}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
