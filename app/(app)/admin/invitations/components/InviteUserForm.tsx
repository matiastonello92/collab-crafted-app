'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Send, X, Copy, Check } from 'lucide-react'
import { fetchAvailableLocations, fetchAvailableRoles, fetchAvailableJobTags } from '@/lib/admin/data-fetchers'
import { PERMISSIONS } from '@/lib/permissions/registry'
import { normalizePermission } from '@/lib/permissions'
import type { Location, Role, JobTag } from '@/lib/admin/data-fetchers'
import { createSupabaseBrowserClient } from '@/lib/supabase'

const inviteSchema = z.object({
  email: z.string().email('Email non valida'),
  days: z.number().min(1).max(30),
})

type InviteForm = z.infer<typeof inviteSchema>

interface OverrideItem {
  location_id: string
  permission_name: string 
  granted: boolean
}

interface JobTagItem {
  location_id: string
  tag_name: string
}

interface RolePreset {
  [permissionName: string]: boolean
}

export function InviteUserForm() {
  const [isPending, startTransition] = useTransition()
  const [locations, setLocations] = useState<Location[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [jobTags, setJobTags] = useState<JobTag[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [selectedJobTagIds, setSelectedJobTagIds] = useState<string[]>([])
  const [rolePresets, setRolePresets] = useState<RolePreset>({})
  const [overrides, setOverrides] = useState<{ [locationId: string]: { [permissionName: string]: boolean } }>({})
  const [invitationLink, setInvitationLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)

  const allPermissions = Object.values(PERMISSIONS).flat()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { days: 7 }
  })

  const selectedDays = watch('days')

  // Load locations, roles, and job tags
  useEffect(() => {
    const loadData = async () => {
      const [locationsData, rolesData, jobTagsData] = await Promise.all([
        fetchAvailableLocations(),
        fetchAvailableRoles(true), // Pass true to filter to base/manager only
        fetchAvailableJobTags(),
      ])
      setLocations(locationsData)
      setRoles(rolesData) // Already filtered on server side
      setJobTags(jobTagsData) // Already filtered to active only on server side
    }
    void loadData()
  }, [])

  // Load role presets using server route - anti-RLS & single source
  useEffect(() => {
    if (!selectedRoleId) {
      setRolePresets({})
      setIsLoadingPresets(false)
      return
    }

    async function loadRolePresets(roleId: string, selectedLocs: string[]) {
      try {
        setIsLoadingPresets(true)
        const res = await fetch(`/api/admin/roles/${roleId}/defaults`, { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        const { permissions } = await res.json() as { permissions: string[] }

        const presets: RolePreset = {}
        permissions.forEach((n) => { presets[n] = true })
        setRolePresets(presets)

        // preserva i delta dell'utente rispetto ai nuovi presets
        const newOverrides: typeof overrides = {}
        selectedLocs.forEach((locId) => {
          const prev = overrides[locId] ?? {}
          const delta: Record<string, boolean> = {}
          allPermissions.forEach((perm) => {
            if (prev[perm] !== undefined && prev[perm] !== (presets[perm] ?? false)) {
              delta[perm] = prev[perm]
            }
          })
          newOverrides[locId] = { ...presets, ...delta }
        })
        setOverrides(newOverrides)
      } catch (err) {
        console.error('loadRolePresets failed', err)
        toast.error('Errore nel caricamento dei permessi del ruolo')
        setRolePresets({})
      } finally {
        setIsLoadingPresets(false)
      }
    }

    loadRolePresets(selectedRoleId, selectedLocationIds)
  }, [selectedRoleId, selectedLocationIds])

  const handleLocationChange = (locationId: string, checked: boolean) => {
    setSelectedLocationIds(prev => {
      const newIds = checked 
        ? [...prev, locationId]
        : prev.filter(id => id !== locationId)
      
      // Update overrides when locations change
      const newOverrides = { ...overrides }
      if (checked) {
        newOverrides[locationId] = { ...rolePresets }
      } else {
        delete newOverrides[locationId]
      }
      setOverrides(newOverrides)
      
      return newIds
    })
  }

  const handlePermissionOverride = (locationId: string, permissionName: string, granted: boolean) => {
    setOverrides(prev => ({
      ...prev,
      [locationId]: {
        ...prev[locationId],
        [permissionName]: granted
      }
    }))
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      toast.success('Link copiato negli appunti!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Errore nella copia del link')
    }
  }

  const onSubmit = async (data: InviteForm) => {
    if (!selectedRoleId || selectedLocationIds.length === 0) {
      toast.error('Seleziona almeno un ruolo e una location')
      return
    }

    startTransition(async () => {
      try {
        // Calculate only the differences from role presets
        const calculatedOverrides: OverrideItem[] = []
        
        selectedLocationIds.forEach(locationId => {
          const locationOverrides = overrides[locationId] || {}
          
          allPermissions.forEach(permissionName => {
            const roleHasPermission = rolePresets[permissionName] || false
            const overrideValue = locationOverrides[permissionName]
            
            // Only include if different from role preset
            if (overrideValue !== undefined && overrideValue !== roleHasPermission) {
              calculatedOverrides.push({
                location_id: locationId,
                permission_name: permissionName,
                granted: overrideValue
              })
            }
          })
        })

        // Prepare job tags for all selected locations
        const jobTagsForLocations: JobTagItem[] = []
        selectedJobTagIds.forEach(tagId => {
          const jobTag = jobTags.find(tag => tag.id === tagId)
          if (jobTag) {
            selectedLocationIds.forEach(locationId => {
              jobTagsForLocations.push({
                location_id: locationId,
                tag_name: jobTag.name
              })
            })
          }
        })

        const supabase = createSupabaseBrowserClient()
        const { data: result, error } = await supabase
          .rpc('invitation_create_v2', {
            p_email: data.email.toLowerCase(),
            p_role_id: selectedRoleId,
            p_location_ids: selectedLocationIds,
            p_days: data.days,
            p_overrides: calculatedOverrides,
            p_job_tags: jobTagsForLocations
          })

        if (error) throw error

        const link = `${window.location.origin}/invite/${result.token}`
        setInvitationLink(link)
        
        toast.success('Invito creato con successo!')
        
        // Dispatch event for list refresh
        window.dispatchEvent(new CustomEvent('invitation:created'))
        
        // Reset form
        reset()
        setSelectedRoleId('')
        setSelectedLocationIds([])
        setSelectedJobTagIds([])
        setRolePresets({})
        setOverrides({})
        setIsLoadingPresets(false)
      } catch (error: any) {
        console.error('Error creating invitation:', error)
        toast.error(error.message || 'Errore durante la creazione dell\'invito')
      }
    })
  }

  if (invitationLink) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-green-600 mb-2">
            Invito Creato con Successo!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Copia e invia questo link all'utente invitato:
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
            setSelectedJobTagIds([])
          }}
          className="w-full"
        >
          Crea Nuovo Invito
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
          placeholder="utente@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <Label>Ruolo *</Label>
        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona ruolo..." />
          </SelectTrigger>
          <SelectContent 
            className="bg-white dark:bg-gray-900 border shadow-md z-50" 
            position="popper"
            sideOffset={4}
          >
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Selection */}
      <div className="space-y-3">
        <Label>Locations * (almeno una)</Label>
        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
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

      {/* Job Tags Selection */}
      <div className="space-y-3">
        <Label>Job Titles (opzionale)</Label>
        <p className="text-sm text-muted-foreground">
          I job titles selezionati verranno applicati a tutte le locations selezionate
        </p>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {jobTags.map(jobTag => (
            <div key={jobTag.id} className="flex items-center space-x-2">
              <Checkbox
                id={jobTag.id}
                checked={selectedJobTagIds.includes(jobTag.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedJobTagIds(prev => [...prev, jobTag.id])
                  } else {
                    setSelectedJobTagIds(prev => prev.filter(id => id !== jobTag.id))
                  }
                }}
              />
              <Label htmlFor={jobTag.id} className="flex-1 cursor-pointer text-sm">
                {jobTag.label}
              </Label>
            </div>
          ))}
        </div>
        {selectedJobTagIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedJobTagIds.map(tagId => {
              const tag = jobTags.find(t => t.id === tagId)
              return tag ? (
                <Badge key={tagId} variant="secondary" className="text-xs">
                  {tag.label}
                </Badge>
              ) : null
            })}
          </div>
        )}
      </div>

      {/* Permission Overrides */}
      {selectedLocationIds.length > 0 && selectedRoleId && (
        <div className="space-y-3">
          <Label>Override Permessi per Location</Label>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">Permesso</th>
                    {selectedLocationIds.map(locationId => {
                      const location = locations.find(l => l.id === locationId)
                      return (
                        <th key={locationId} className="text-center p-2 font-medium min-w-24">
                          {location?.name}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allPermissions.map(permission => {
                    const normalizedPermission = normalizePermission(permission)
                    return (
                      <tr key={permission} className="border-t">
                        <td className="p-2 font-mono text-xs">{permission}</td>
                        {selectedLocationIds.map(locationId => {
                          const isRoleDefault = rolePresets[normalizedPermission] || false
                          const overrideValue = overrides[locationId]?.[normalizedPermission]
                          const currentValue = overrideValue !== undefined ? overrideValue : isRoleDefault
                          
                          return (
                            <td key={locationId} className="p-2 text-center">
                              <Checkbox
                                checked={currentValue}
                                disabled={isLoadingPresets}
                                onCheckedChange={(checked) =>
                                  handlePermissionOverride(locationId, normalizedPermission, checked as boolean)
                                }
                                className={
                                  overrideValue !== undefined && overrideValue !== isRoleDefault
                                    ? 'border-orange-500'
                                    : ''
                                }
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {isLoadingPresets && (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
              <p className="text-xs text-muted-foreground mt-1">Caricamento permessi...</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            I checkbox con bordo arancione indicano override rispetto ai permessi del ruolo
          </p>
        </div>
      )}

      {/* Expiry Days */}
      <div className="space-y-2">
        <Label htmlFor="days">Scadenza (giorni)</Label>
        <Input
          id="days"
          type="number"
          min="1"
          max="30"
          {...register('days', { valueAsNumber: true })}
        />
        {errors.days && (
          <p className="text-sm text-destructive">{errors.days.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          L'invito scadrà tra {selectedDays} giorni
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending || !selectedRoleId || selectedLocationIds.length === 0}
        className="w-full"
      >
        <Send className="h-4 w-4 mr-2" />
        {isPending ? 'Creazione in corso...' : 'Crea Invito'}
      </Button>
    </form>
  )
}