'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchAvailablePermissions } from '@/lib/admin/data-fetchers'
import type { Permission } from '@/lib/admin/data-fetchers'
import { useTranslation } from '@/lib/i18n'

interface PermissionGridProps {
  selectedPermissions: string[]
  onPermissionChange: (permissions: string[]) => void
  roleId?: string
}

export function PermissionGrid({ selectedPermissions, onPermissionChange, roleId }: PermissionGridProps) {
  const { t } = useTranslation()
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([])
  const [rolePresetPermissions, setRolePresetPermissions] = useState<string[]>([])
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)

  // Load available permissions on mount
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const data = await fetchAvailablePermissions()
        setAvailablePermissions(data)
      } catch (error) {
        console.error('Failed to load permissions:', error)
        toast.error(t('userManagement.permissionGrid.loadError'))
      } finally {
        setIsLoadingPermissions(false)
      }
    }
    loadPermissions()
  }, [])

  // Load role presets when roleId changes
  useEffect(() => {
    const loadRolePresets = async () => {
      if (!roleId) {
        setRolePresetPermissions([])
        return
      }

      setIsLoadingPresets(true)
      try {
        const response = await fetch(`/api/v1/admin/roles/${roleId}/defaults`)
        if (!response.ok) {
          throw new Error('Failed to fetch role defaults')
        }
        
        const data = await response.json()
        const presets = data.permissions || []
        setRolePresetPermissions(presets)
        
        // Auto-select preset permissions (preserve manual overrides)
        const newSelections = new Set(selectedPermissions)
        presets.forEach((perm: string) => newSelections.add(perm))
        onPermissionChange(Array.from(newSelections))

      } catch (error) {
        console.error('Failed to load role presets:', error)
        toast.error(t('userManagement.permissionGrid.loadPresetsError'))
        setRolePresetPermissions([])
      } finally {
        setIsLoadingPresets(false)
      }
    }

    loadRolePresets()
  }, [roleId]) // Only depend on roleId, not selectedPermissions to avoid loops

  const handlePermissionToggle = (permissionName: string, checked: boolean) => {
    const newSelections = checked
      ? [...selectedPermissions, permissionName]
      : selectedPermissions.filter(p => p !== permissionName)
    
    onPermissionChange(newSelections)
  }

  const resetToPresets = () => {
    onPermissionChange([...rolePresetPermissions])
    toast.success(t('userManagement.permissionGrid.resetSuccess'))
  }

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    const category = permission.category || 'Altri'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  if (isLoadingPermissions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('userManagement.permissionGrid.loading')}
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('userManagement.permissionGrid.title')}
            {isLoadingPresets && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {roleId && rolePresetPermissions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToPresets}
              disabled={isLoadingPresets}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('userManagement.permissionGrid.resetToDefaults')}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {t('userManagement.permissionGrid.description')} ({selectedPermissions.length} {t('userManagement.permissionGrid.selected')})
          {roleId && rolePresetPermissions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {rolePresetPermissions.length} {t('userManagement.permissionGrid.defaultFromRole')}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedPermissions).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="mx-auto h-8 w-8 mb-2" />
            <p>{t('userManagement.permissionGrid.noPermissions')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryPermissions]) => (
              <div key={category}>
                <h4 className="font-medium text-sm mb-3 text-muted-foreground">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryPermissions
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .map((permission) => {
                    const isSelected = selectedPermissions.includes(permission.name)
                    const isPreset = rolePresetPermissions.includes(permission.name)
                    
                    return (
                      <div
                        key={permission.id}
                        className={`flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                          isPreset ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <Checkbox
                          id={`permission-${permission.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => 
                            handlePermissionToggle(permission.name, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`permission-${permission.id}`}
                            className="block text-sm font-medium cursor-pointer"
                          >
                            {permission.display_name}
                            {isPreset && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {t('userManagement.permissionGrid.defaultBadge')}
                              </Badge>
                            )}
                          </label>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {permission.name}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}