'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Key, CheckCircle, XCircle, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { UserPermissionOverride } from '@/lib/data/admin'
import type { Permission, Location } from '@/lib/admin/data-fetchers'
import { setPermissionOverride, removePermissionOverride } from '@/lib/admin/mutations'
import { fetchAvailablePermissions, fetchAvailableLocations } from '@/lib/admin/data-fetchers'
import { useTranslation } from '@/lib/i18n'

interface PermissionOverridesPanelProps {
  overrides: UserPermissionOverride[]
  userId: string
  onUpdate?: () => void
}

interface OptimisticOverride extends UserPermissionOverride {
  _optimistic?: 'adding' | 'removing' | 'updating'
}

export default function PermissionOverridesPanel({ overrides, userId, onUpdate }: PermissionOverridesPanelProps) {
  const [isPending, startTransition] = useTransition()
  const { t } = useTranslation()
  const [optimisticOverrides, addOptimisticOverride] = useOptimistic(
    overrides as OptimisticOverride[],
    (currentOverrides, action: { type: 'add' | 'remove' | 'update'; override: UserPermissionOverride }): OptimisticOverride[] => {
      if (action.type === 'add') {
        return [...currentOverrides, { ...action.override, _optimistic: 'adding' as const }]
      } else if (action.type === 'remove') {
        return currentOverrides.map(o => 
          o.permission_name === action.override.permission_name && 
          o.location_id === action.override.location_id
            ? { ...o, _optimistic: 'removing' as const }
            : o
        )
      } else {
        return currentOverrides.map(o => 
          o.permission_name === action.override.permission_name && 
          o.location_id === action.override.location_id
            ? { ...action.override, _optimistic: 'updating' as const }
            : o
        )
      }
    }
  )

  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>()
  const [isGranted, setIsGranted] = useState(true)

  // Load available data when dialog opens
  const handleDialogOpen = async () => {
    setIsDialogOpen(true)
    const [permissionsData, locationsData] = await Promise.all([
      fetchAvailablePermissions(),
      fetchAvailableLocations()
    ])
    setAvailablePermissions(permissionsData)
    setAvailableLocations(locationsData)
  }

  const handleSetOverride = async () => {
    if (!selectedPermission) return

    const permissionToSet = availablePermissions.find(p => p.id === selectedPermission)
    if (!permissionToSet) return

    // Optimistic update
    const optimisticOverride: UserPermissionOverride = {
      permission_name: permissionToSet.name,
      permission_display_name: permissionToSet.display_name,
      permission_category: permissionToSet.category,
      location_name: selectedLocation 
        ? availableLocations.find(l => l.id === selectedLocation)?.name || null
        : null,
      location_id: selectedLocation || null,
      granted: isGranted,
      granted_at: new Date().toISOString(),
      granted_by: null
    }

    // Check if override already exists to determine if this is add or update
    const existingIndex = optimisticOverrides.findIndex(o => 
      o.permission_name === permissionToSet.name && 
      o.location_id === (selectedLocation || null)
    )
    
    if (existingIndex >= 0) {
      addOptimisticOverride({ type: 'update', override: optimisticOverride })
    } else {
      addOptimisticOverride({ type: 'add', override: optimisticOverride })
    }

    startTransition(async () => {
      const result = await setPermissionOverride(userId, {
        permission_id: selectedPermission,
        granted: isGranted,
        location_id: selectedLocation
      })

      if (result.success) {
        toast.success(result.message)
        setIsDialogOpen(false)
        setSelectedPermission('')
        setSelectedLocation(undefined)
        setIsGranted(true)
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to set permission override')
        // Revert optimistic update on error
        onUpdate?.()
      }
    })
  }

  const handleRemoveOverride = async (override: UserPermissionOverride) => {
    // Find the permission ID from available permissions
    const permissionData = availablePermissions.find(p => p.name === override.permission_name)
    if (!permissionData) {
      toast.error('Permission data not found')
      return
    }

    // Optimistic update
    addOptimisticOverride({ type: 'remove', override })

    startTransition(async () => {
      const result = await removePermissionOverride(
        userId, 
        permissionData.id, 
        override.location_id || undefined
      )

      if (result.success) {
        toast.success(result.message)
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to remove permission override')
        // Revert optimistic update on error
        onUpdate?.()
      }
    })
  }

  const groupedByCategory = optimisticOverrides.reduce((acc, override) => {
    const category = override.permission_category || 'Altri'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(override)
    return acc
  }, {} as Record<string, OptimisticOverride[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('admin.permissionOverrides')}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleDialogOpen}>
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.permissionOverridesSet')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.permissionOverridesSetTitle')}</DialogTitle>
                <DialogDescription>
                  {t('admin.permissionOverridesSetDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('admin.permissionOverridesPermission')}</label>
                  <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.permissionOverridesSelectPermission')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePermissions.map((permission) => (
                        <SelectItem key={permission.id} value={permission.id}>
                          <div>
                            <div className="font-medium">{permission.display_name}</div>
                            <div className="text-xs text-muted-foreground">{permission.name}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('admin.permissionOverridesLocation')}</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.permissionOverridesGlobal')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__global__">{t('admin.permissionOverridesGlobal')}</SelectItem>
                      {availableLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="granted"
                    checked={isGranted}
                    onCheckedChange={setIsGranted}
                  />
                  <label htmlFor="granted" className="text-sm font-medium">
                    {isGranted ? t('admin.permissionOverridesGrant') : t('admin.permissionOverridesDeny')}
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isPending}
                  >
                    {t('admin.cancel')}
                  </Button>
                  <Button 
                    onClick={handleSetOverride} 
                    disabled={!selectedPermission || isPending}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isGranted ? t('admin.permissionOverridesGranted') : t('admin.permissionOverridesDenied')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          {t('admin.permissionOverridesDesc')} ({optimisticOverrides.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {optimisticOverrides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="mx-auto h-8 w-8 mb-2" />
            <p>{t('admin.permissionOverridesNone')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, categoryOverrides]) => (
              <div key={category}>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h4>
                <div className="space-y-2">
                  {categoryOverrides.map((override, index) => (
                    <div 
                      key={`${override.permission_name}-${override.location_id}-${index}`}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        override._optimistic ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {override.permission_display_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {override.permission_name}
                        </div>
                        {override.location_name && (
                          <Badge variant="outline" className="text-xs">
                            {override.location_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {override._optimistic === 'removing' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : override.granted ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-xs font-medium">
                            {override._optimistic === 'removing' 
                              ? t('admin.removing')
                              : override._optimistic === 'updating'
                              ? t('admin.updating')
                              : override._optimistic === 'adding'
                              ? t('admin.adding')
                              : override.granted ? t('admin.permissionOverridesGranted') : t('admin.permissionOverridesDenied')
                            }
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveOverride(override)}
                          disabled={isPending || override._optimistic === 'removing'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}