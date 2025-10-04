'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Shield, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { UserRolesByLocation } from '@/lib/data/admin'
import type { Role, Location } from '@/lib/admin/data-fetchers'
import { assignRole, revokeRole } from '@/lib/admin/mutations'
import { fetchAvailableRoles, fetchAvailableLocations } from '@/lib/admin/data-fetchers'
import { useTranslation } from '@/lib/i18n'

interface RolesByLocationPanelProps {
  roles: UserRolesByLocation[]
  userId: string
  onUpdate?: () => void
}

interface OptimisticRole extends UserRolesByLocation {
  _optimistic?: 'adding' | 'removing'
}

export default function RolesByLocationPanel({ roles, userId, onUpdate }: RolesByLocationPanelProps) {
  const [isPending, startTransition] = useTransition()
  const { t } = useTranslation()
  const [optimisticRoles, addOptimisticRole] = useOptimistic(
    roles as OptimisticRole[],
    (currentRoles, action: { type: 'add' | 'remove'; role: UserRolesByLocation }): OptimisticRole[] => {
      if (action.type === 'add') {
        return [...currentRoles, { ...action.role, _optimistic: 'adding' as const }]
      } else {
        return currentRoles.map(r => 
          r.role_name === action.role.role_name && r.location_id === action.role.location_id
            ? { ...r, _optimistic: 'removing' as const }
            : r
        )
      }
    }
  )

  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>()

  // Load available data when dialog opens
  const handleDialogOpen = async () => {
    setIsDialogOpen(true)
    const [rolesData, locationsData] = await Promise.all([
      fetchAvailableRoles(),
      fetchAvailableLocations()
    ])
    setAvailableRoles(rolesData)
    setAvailableLocations(locationsData)
  }

  const handleAssignRole = async () => {
    if (!selectedRole) return

    const roleToAssign = availableRoles.find(r => r.id === selectedRole)
    if (!roleToAssign) return

    // Optimistic update
    const optimisticRole: UserRolesByLocation = {
      location_name: selectedLocation 
        ? availableLocations.find(l => l.id === selectedLocation)?.name || 'Unknown'
        : 'Global',
      location_id: selectedLocation || null,
      role_name: roleToAssign.name,
      role_display_name: roleToAssign.display_name,
      role_level: roleToAssign.level,
      assigned_at: new Date().toISOString(),
      assigned_by: null,
      is_active: true
    }

    addOptimisticRole({ type: 'add', role: optimisticRole })

    startTransition(async () => {
      const result = await assignRole(userId, {
        role_id: selectedRole,
        location_id: selectedLocation
      })

      if (result.success) {
        toast.success(result.message)
        setIsDialogOpen(false)
        setSelectedRole('')
        setSelectedLocation(undefined)
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to assign role')
        // Revert optimistic update on error by triggering a re-render
        onUpdate?.()
      }
    })
  }

  const handleRevokeRole = async (role: UserRolesByLocation) => {
    // Find the role ID from available roles
    const roleData = availableRoles.find(r => r.name === role.role_name)
    if (!roleData) {
      toast.error('Role data not found')
      return
    }

    // Optimistic update
    addOptimisticRole({ type: 'remove', role })

    startTransition(async () => {
      const result = await revokeRole(userId, {
        role_id: roleData.id,
        location_id: role.location_id || undefined
      })

      if (result.success) {
        toast.success(result.message)
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to revoke role')
        // Revert optimistic update on error
        onUpdate?.()
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('admin.rolesByLocation')}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleDialogOpen}>
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.rolesByLocationAssign')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.rolesByLocationAssignTitle')}</DialogTitle>
                <DialogDescription>
                  {t('admin.rolesByLocationAssignDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('admin.rolesByLocationRole')}</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.rolesByLocationSelectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.display_name} ({t('admin.rolesByLocationLevel')} {role.level})
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
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isPending}
                  >
                    {t('admin.cancel')}
                  </Button>
                  <Button 
                    onClick={handleAssignRole} 
                    disabled={!selectedRole || isPending}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.rolesByLocationAssign')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          {t('admin.rolesByLocationDesc')} ({optimisticRoles.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {optimisticRoles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="mx-auto h-8 w-8 mb-2" />
            <p>{t('admin.rolesByLocationNone')}</p>
          </div>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.permissionOverridesLocation')}</TableHead>
                  <TableHead>{t('admin.rolesByLocationRole')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead>{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {optimisticRoles.map((role, index) => (
                <TableRow 
                  key={`${role.role_name}-${role.location_id}-${index}`}
                  className={role._optimistic ? 'opacity-50' : ''}
                >
                  <TableCell>
                    <div className="font-medium">
                      {role.location_name}
                    </div>
                    {role.assigned_at && (
                      <div className="text-xs text-muted-foreground">
                        {t('admin.rolesByLocationFrom')} {new Date(role.assigned_at).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="secondary">
                        {role.role_display_name}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {t('admin.rolesByLocationLevel')} {role.role_level}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={role.is_active && !role._optimistic ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {role._optimistic === 'removing' 
                        ? t('admin.removing')
                        : role._optimistic === 'adding'
                        ? t('admin.assigning')
                        : role.is_active ? t('admin.active') : t('admin.inactive')
                      }
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeRole(role)}
                      disabled={isPending || role._optimistic === 'removing'}
                    >
                      {role._optimistic === 'removing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('admin.remove')}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}