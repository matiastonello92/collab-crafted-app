'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Send, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchAvailableLocations, fetchAvailableRoles } from '@/lib/admin/data-fetchers'
import { PERMISSIONS } from '@/lib/permissions/registry'
import type { Location, Role } from '@/lib/admin/data-fetchers'
import { useTranslation } from '@/lib/i18n'
import { RolePresetSelector, type RolePresetType } from '@/components/admin/invitations/RolePresetSelector'
import { PermissionCategoryAccordion } from '@/components/admin/invitations/PermissionCategoryAccordion'
import { getAllCategorizedPermissions } from '@/lib/permissions/categories'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  notes: z.string().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

export function InviteUserForm() {
  const [isPending, startTransition] = useTransition()
  const [locations, setLocations] = useState<Location[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [selectedPreset, setSelectedPreset] = useState<RolePresetType | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [invitationLink, setInvitationLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { t } = useTranslation()

  const allPermissions = Object.values(PERMISSIONS).flat()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  // Load locations and roles
  useEffect(() => {
    const loadData = async () => {
      const [locationsData, rolesData] = await Promise.all([
        fetchAvailableLocations(),
        fetchAvailableRoles(true),
      ])
      setLocations(locationsData)
      setRoles(rolesData)
    }
    void loadData()
  }, [])

  // Auto-apply preset permissions when preset or role changes
  useEffect(() => {
    if (!selectedPreset || !selectedRoleId) return

    const applyPresetPermissions = async () => {
      try {
        // Load role default permissions
        const res = await fetch(`/api/admin/roles/${selectedRoleId}/defaults`, { cache: 'no-store' })
        if (!res.ok) return
        
        const { permissions } = await res.json() as { permissions: string[] }
        
        // Apply based on preset type
        let permissionsToSet: string[] = []
        
        switch (selectedPreset) {
          case 'admin':
            // All permissions
            permissionsToSet = allPermissions
            break
          case 'manager':
            // Role permissions + some extras
            permissionsToSet = permissions
            break
          case 'staff':
            // Minimal permissions
            permissionsToSet = permissions.filter(p => 
              p.includes(':view') || p.includes('shifts:') || p.includes('tasks:')
            )
            break
          case 'custom':
            // Use role defaults as starting point
            permissionsToSet = permissions
            break
        }
        
        setSelectedPermissions(new Set(permissionsToSet))
      } catch (err) {
        console.error('Failed to load preset permissions', err)
      }
    }

    applyPresetPermissions()
  }, [selectedPreset, selectedRoleId, allPermissions])

  const handleLocationChange = (locationId: string, checked: boolean) => {
    setSelectedLocationIds(prev => 
      checked ? [...prev, locationId] : prev.filter(id => id !== locationId)
    )
  }

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(permission)
      } else {
        newSet.delete(permission)
      }
      return newSet
    })
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const onSubmit = async (data: InviteForm) => {
    if (!selectedRoleId || selectedLocationIds.length === 0) {
      toast.error('Please select a role and at least one location')
      return
    }

    if (!selectedPreset) {
      toast.error('Please select a role preset')
      return
    }

    startTransition(async () => {
      try {
        // Prepare payload for API route (compatible with existing route)
        const payload = {
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          notes: data.notes || '',
          locationRoles: selectedLocationIds.map(locationId => ({
            locationId,
            roleId: selectedRoleId,
          })),
        }

        // Call API route (which handles email sending via Resend)
        const response = await fetch('/api/v1/admin/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create invitation')
        }

        const result = await response.json()
        const link = `${window.location.origin}/invite/${result.invitation.token}`
        setInvitationLink(link)
        
        toast.success('Invitation created and email sent!')
        
        // Dispatch event for list refresh
        window.dispatchEvent(new CustomEvent('invitation:created'))
        
        // Reset form
        reset()
        setSelectedRoleId('')
        setSelectedLocationIds([])
        setSelectedPreset(null)
        setSelectedPermissions(new Set())
      } catch (error: any) {
        console.error('Error creating invitation:', error)
        toast.error(error.message || 'Failed to create invitation')
      }
    })
  }

  if (invitationLink) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-600 mb-2">
            Invitation Created Successfully!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            An email has been sent with the invitation link. You can also share it manually:
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input 
            value={invitationLink} 
            readOnly 
            className="font-mono text-xs"
          />
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <Button 
          onClick={() => {
            setInvitationLink('')
            setCopied(false)
          }}
          className="w-full"
        >
          Create Another Invitation
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* First & Last Name - Required */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Role Preset Selection */}
      <div className="space-y-3">
        <Label>Role Template *</Label>
        <p className="text-sm text-muted-foreground">
          Choose a template to quickly set up permissions
        </p>
        <RolePresetSelector
          selected={selectedPreset}
          onSelect={setSelectedPreset}
        />
      </div>

      {/* Role Selection (actual DB role) */}
      {selectedPreset && (
        <div className="space-y-2">
          <Label>Assign Database Role *</Label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {role.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Location Selection */}
      {selectedRoleId && (
        <div className="space-y-3">
          <Label>Locations * (At least one)</Label>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
            {locations.map(location => (
              <div key={location.id} className="flex items-center space-x-2">
                <Checkbox
                  id={location.id}
                  checked={selectedLocationIds.includes(location.id)}
                  onCheckedChange={(checked) => 
                    handleLocationChange(location.id, checked as boolean)
                  }
                />
                <Label htmlFor={location.id} className="flex-1 cursor-pointer">
                  {location.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Management (only for Custom preset) */}
      {selectedPreset === 'custom' && selectedLocationIds.length > 0 && (
        <div className="space-y-3">
          <Label>Customize Permissions</Label>
          <p className="text-sm text-muted-foreground">
            Select which permissions this user should have
          </p>
          <PermissionCategoryAccordion
            selectedPermissions={selectedPermissions}
            onPermissionToggle={handlePermissionToggle}
            disabled={isPending}
          />
        </div>
      )}

      {/* Advanced: Show all permissions for non-custom presets */}
      {selectedPreset && selectedPreset !== 'custom' && selectedLocationIds.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Advanced Options
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Advanced Options
              </>
            )}
          </Button>
          
          {showAdvanced && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <Label className="mb-3 block">Fine-tune Permissions</Label>
              <PermissionCategoryAccordion
                selectedPermissions={selectedPermissions}
                onPermissionToggle={handlePermissionToggle}
                disabled={isPending}
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Internal Notes (optional)</Label>
        <Input
          id="notes"
          placeholder="Add any internal notes..."
          {...register('notes')}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending || !selectedRoleId || selectedLocationIds.length === 0 || !selectedPreset}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        {isPending ? 'Creating Invitation...' : 'Create & Send Invitation'}
      </Button>
    </form>
  )
}
