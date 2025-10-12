'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { X, Plus, Send } from 'lucide-react'
import { fetchAvailableLocations, fetchAvailableRoles } from '@/lib/admin/data-fetchers'
import type { Location, Role } from '@/lib/admin/data-fetchers'
import { PermissionGrid } from './PermissionGrid'
import { useTranslation } from '@/lib/i18n'

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  notes: z.string().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

interface LocationRole {
  locationId: string
  locationName: string
  roleId: string
  roleName: string
}

export function InviteUserForm() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [locations, setLocations] = useState<Location[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [locationRoles, setLocationRoles] = useState<LocationRole[]>([])
  const [globalRoleId, setGlobalRoleId] = useState<string>('')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  // Determine active role for permission presets (prioritize global, then first location role)
  const activeRoleForPermissions = globalRoleId || locationRoles[0]?.roleId || ''

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  // Load locations and roles on mount
  useEffect(() => {
    const loadData = async () => {
      const [locationsData, rolesData] = await Promise.all([
        fetchAvailableLocations(),
        fetchAvailableRoles(),
      ])
      setLocations(locationsData)
      setRoles(rolesData)
    }
    void loadData()
  }, [])

  const addLocationRole = () => {
    if (!selectedLocationId || !selectedRoleId) return

    const location = locations.find(l => l.id === selectedLocationId)
    const role = roles.find(r => r.id === selectedRoleId)
    
    if (!location || !role) return

    // Check if this combination already exists
    if (locationRoles.some(lr => lr.locationId === selectedLocationId && lr.roleId === selectedRoleId)) {
      toast.error(t('userManagement.inviteForm.alreadyExists'))
      return
    }

    setLocationRoles(prev => [...prev, {
      locationId: selectedLocationId,
      locationName: location.name,
      roleId: selectedRoleId,
      roleName: role.display_name,
    }])

    setSelectedLocationId('')
    setSelectedRoleId('')
  }

  const removeLocationRole = (index: number) => {
    setLocationRoles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: InviteForm) => {
    // Validate with translation
    if (!z.string().email().safeParse(data.email).success) {
      setError('email', { message: t('userManagement.inviteForm.emailInvalid') })
      return
    }
    if (!data.firstName.trim()) {
      setError('firstName', { message: t('userManagement.inviteForm.firstNameRequired') })
      return
    }
    if (!data.lastName.trim()) {
      setError('lastName', { message: t('userManagement.inviteForm.lastNameRequired') })
      return
    }

    try {
      const payload = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        notes: data.notes || null,
        globalRoleId: globalRoleId || null,
        locationRoles: locationRoles.map(lr => ({
          locationId: lr.locationId,
          roleId: lr.roleId,
        })),
        permissions: selectedPermissions, // Include selected permissions
      }

      const response = await fetch('/api/v1/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || t('userManagement.inviteForm.error'))
      }

      const result = await response.json()
      toast.success(t('userManagement.inviteForm.success'))
      
      startTransition(() => {
        router.push('/admin/users')
      })
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(error instanceof Error ? error.message : t('userManagement.inviteForm.error'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('userManagement.inviteForm.email')} *</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('userManagement.inviteForm.emailPlaceholder')}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">{t('userManagement.inviteForm.firstName')} *</Label>
          <Input
            id="firstName"
            placeholder={t('userManagement.inviteForm.firstNamePlaceholder')}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">{t('userManagement.inviteForm.lastName')} *</Label>
          <Input
            id="lastName"
            placeholder={t('userManagement.inviteForm.lastNamePlaceholder')}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Global Role */}
      <div className="space-y-2">
        <Label>{t('userManagement.inviteForm.globalRole')}</Label>
        <Select value={globalRoleId} onValueChange={setGlobalRoleId}>
          <SelectTrigger>
            <SelectValue placeholder={t('userManagement.inviteForm.selectGlobalRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('userManagement.inviteForm.noGlobalRole')}</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Roles */}
      <div className="space-y-4">
        <Label>{t('userManagement.inviteForm.locationRoles')}</Label>
        
        <div className="flex gap-2">
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t('userManagement.inviteForm.selectLocation')} />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t('userManagement.inviteForm.selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {role.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLocationRole}
            disabled={!selectedLocationId || !selectedRoleId}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {locationRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('userManagement.inviteForm.assignedRoles')}</p>
            <div className="flex flex-wrap gap-2">
              {locationRoles.map((lr, index) => (
                <Badge key={index} variant="secondary" className="pr-1">
                  {lr.locationName} - {lr.roleName}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-4 w-4 p-0"
                    onClick={() => removeLocationRole(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Permission Selection */}
      <PermissionGrid
        selectedPermissions={selectedPermissions}
        onPermissionChange={setSelectedPermissions}
        roleId={activeRoleForPermissions}
      />

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('userManagement.inviteForm.notes')}</Label>
        <Textarea
          id="notes"
          placeholder={t('userManagement.inviteForm.notesPlaceholder')}
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          {isPending ? t('userManagement.inviteForm.sending') : t('userManagement.inviteForm.sendInvite')}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/users')}
          disabled={isPending}
        >
          {t('userManagement.inviteForm.cancel')}
        </Button>
      </div>
    </form>
  )
}