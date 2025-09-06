'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Star, Info } from 'lucide-react'
import { normalizeSet } from '@/lib/permissions'

interface EffectivePermissionsProps {
  userId: string
}

interface UserPermissions {
  permissions: string[]
  is_admin?: boolean
}

export function EffectivePermissions({ userId }: EffectivePermissionsProps) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch(`/api/v1/admin/users/${userId}/permissions`)
        if (!response.ok) {
          throw new Error('Failed to fetch permissions')
        }
        const data = await response.json()
        setPermissions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permessi Effettivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permessi Effettivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Errore nel caricamento dei permessi: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const normalizedPermissions = normalizeSet(permissions?.permissions || [])
  const isAdmin = permissions?.is_admin || normalizedPermissions.includes('*')

  // Group permissions by module
  const groupedPermissions = normalizedPermissions.reduce((acc, perm) => {
    const [module, action] = perm.split(':')
    if (!acc[module]) acc[module] = []
    acc[module].push(action || 'all')
    return acc
  }, {} as Record<string, string[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permessi Effettivi
          {isAdmin && (
            <Badge variant="destructive" className="ml-2">
              <Star className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <Alert>
            <Star className="h-4 w-4" />
            <AlertDescription>
              Questo utente ha privilegi amministrativi completi (wildcard "*"). 
              Può accedere a tutte le funzionalità del sistema.
            </AlertDescription>
          </Alert>
        )}

        {normalizedPermissions.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nessun permesso assegnato. L'utente può accedere solo alle funzionalità base.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, actions]) => (
              <div key={module} className="space-y-2">
                <h4 className="font-medium capitalize text-sm">
                  {module === '*' ? 'Amministratore' : module}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {action === 'all' ? 'Tutti i permessi' : action}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Totale permessi: {normalizedPermissions.length}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}