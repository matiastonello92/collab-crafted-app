'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store/unified'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, X, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslation } from '@/lib/i18n'

type Location = {
  id: string
  name: string
}

type JobTag = {
  id: string
  label_it: string
  key: string
  categoria: string | null
  color: string | null
  is_active: boolean
}

type User = {
  id: string
  full_name: string
  email: string
}

type Assignment = {
  id: string
  job_tag_id: string
  is_primary: boolean
  note: string | null
  job_tag: JobTag
}

type UserAssignments = {
  user: User
  assignments: Assignment[]
}

export function AssegnazioniTab() {
  const { t } = useTranslation()
  // Global context (like inventory modules)
  const rawLocationId = useAppStore(state => state.context.location_id)
  const defaultLocationId = rawLocationId === 'null' || !rawLocationId ? undefined : rawLocationId
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocationId || '')
  const [jobTags, setJobTags] = useState<JobTag[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userAssignments, setUserAssignments] = useState<Map<string, Assignment[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!hasHydrated) return
    fetchLocations()
    fetchJobTags()
  }, [hasHydrated])

  // Auto-select default location from context when hydrated
  useEffect(() => {
    if (hasHydrated && defaultLocationId && !selectedLocation) {
      setSelectedLocation(defaultLocationId)
    }
  }, [hasHydrated, defaultLocationId])

  // Wait for hydration before fetching data
  useEffect(() => {
    if (hasHydrated && selectedLocation) {
      fetchUsersAndAssignments()
    }
  }, [hasHydrated, selectedLocation])

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/v1/admin/locations', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLocations(data.locations || [])
    } catch (error) {
      toast.error(t('staff.jobTags.assignments.errorLoadingLocations'))
    }
  }

  const fetchJobTags = async () => {
    try {
      const res = await fetch('/api/v1/admin/job-tags?is_active=true', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setJobTags(data.jobTags || [])
    } catch (error) {
      toast.error(t('staff.jobTags.assignments.errorLoadingTags'))
    }
  }

  const fetchUsersAndAssignments = async () => {
    setLoading(true)
    try {
      // Fetch users for location
      console.log('🔍 [AssegnazioniTab] Fetching users for location:', selectedLocation)
      const usersRes = await fetch(`/api/v1/admin/users?location_id=${selectedLocation}`, { credentials: 'include' })
      console.log('🔍 [AssegnazioniTab] Users response:', { status: usersRes.status, ok: usersRes.ok })
      
      if (!usersRes.ok) {
        const errorData = await usersRes.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
        console.error('❌ [AssegnazioniTab] Failed to fetch users:', { status: usersRes.status, error: errorData })
        throw new Error(errorData.error || t('staff.jobTags.assignments.errorLoadingUsers'))
      }
      const usersData = await usersRes.json()
      console.log('✅ [AssegnazioniTab] Users fetched:', usersData.users?.length || 0)
      setUsers(usersData.users || [])

      // Fetch assignments for location
      const assignRes = await fetch(`/api/v1/admin/user-job-tags?location_id=${selectedLocation}`, { credentials: 'include' })
      if (!assignRes.ok) {
        const errorData = await assignRes.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
        throw new Error(errorData.error || t('staff.jobTags.assignments.errorLoadingAssignments'))
      }
      const assignData = await assignRes.json()

      // Group by user
      const grouped = new Map<string, Assignment[]>()
      for (const assign of assignData.assignments || []) {
        if (!grouped.has(assign.user_id)) {
          grouped.set(assign.user_id, [])
        }
        grouped.get(assign.user_id)!.push(assign)
      }
      setUserAssignments(grouped)
    } catch (error) {
      toast.error('Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrimary = async (userId: string, tagId: string) => {
    try {
      const existing = userAssignments.get(userId) || []
      const assignment = existing.find((a) => a.job_tag_id === tagId)

      if (assignment) {
        // Update existing to primary
        const res = await fetch(`/api/v1/admin/user-job-tags/${assignment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_primary: true }),
          credentials: 'include',
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
          throw new Error(errorData.error || t('staff.jobTags.assignments.errorUpdating'))
        }
      } else {
        // Create new primary
        const res = await fetch('/api/v1/admin/user-job-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_id: selectedLocation,
            user_id: userId,
            job_tag_id: tagId,
            is_primary: true,
          }),
          credentials: 'include',
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
          throw new Error(errorData.error || t('staff.jobTags.assignments.errorAssigning'))
        }
      }

      toast.success(t('staff.jobTags.tagPrimarySet'))
      fetchUsersAndAssignments()
    } catch (error: any) {
      toast.error(error.message || t('staff.jobTags.assignments.errorSaving'))
    }
  }

  const handleToggleSecondary = async (userId: string, tagId: string) => {
    try {
      const existing = userAssignments.get(userId) || []
      const assignment = existing.find((a) => a.job_tag_id === tagId)

      if (assignment) {
        // Remove
        const res = await fetch(`/api/v1/admin/user-job-tags/${assignment.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
          throw new Error(errorData.error || t('staff.jobTags.assignments.errorRemoving'))
        }
        toast.success(t('staff.jobTags.tagRemoved'))
      } else {
        // Add
        const res = await fetch('/api/v1/admin/user-job-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_id: selectedLocation,
            user_id: userId,
            job_tag_id: tagId,
            is_primary: false,
          }),
          credentials: 'include',
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: t('staff.jobTags.assignments.errorUnknown') }))
          throw new Error(errorData.error || t('staff.jobTags.assignments.errorAssigning'))
        }
        toast.success(t('staff.jobTags.tagAssigned'))
      }

      fetchUsersAndAssignments()
    } catch (error: any) {
      toast.error(error.message || t('staff.jobTags.assignments.errorSaving'))
    }
  }

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!selectedLocation) {
    return (
      <div className="space-y-4">
        <Label>Seleziona Location</Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Scegli una location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (jobTags.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('staff.jobTags.assignments.noTags')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label>Location</Label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <Label>Cerca Utente</Label>
          <Input
            placeholder="Nome o email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const assignments = userAssignments.get(user.id) || []
            const primaryAssignment = assignments.find((a) => a.is_primary)
            const secondaryAssignments = assignments.filter((a) => !a.is_primary)
            const hasPrimary = !!primaryAssignment

            return (
              <Card key={user.id} className={!hasPrimary ? 'border-destructive' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{user.full_name || user.email}</span>
                    {!hasPrimary && (
                      <Badge variant="destructive">Manca primario</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Primario (obbligatorio)
                    </Label>
                    <Select
                      value={primaryAssignment?.job_tag_id || ''}
                      onValueChange={(val) => handleSetPrimary(user.id, val)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona tag primario" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTags.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              {tag.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                              )}
                              <span>{tag.label_it}</span>
                              {tag.categoria && (
                                <Badge variant="outline" className="text-xs">
                                  {tag.categoria}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Secondari (opzionali)
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {jobTags
                        .filter((tag) => tag.id !== primaryAssignment?.job_tag_id)
                        .map((tag) => {
                          const isAssigned = secondaryAssignments.some(
                            (a) => a.job_tag_id === tag.id
                          )
                          return (
                            <Badge
                              key={tag.id}
                              variant={isAssigned ? 'default' : 'outline'}
                              className="cursor-pointer"
                              style={
                                isAssigned && tag.color
                                  ? { backgroundColor: tag.color }
                                  : undefined
                              }
                              onClick={() => handleToggleSecondary(user.id, tag.id)}
                            >
                              {tag.label_it}
                              {isAssigned && <X className="ml-1 h-3 w-3" />}
                            </Badge>
                          )
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('staff.jobTags.assignments.noUsers')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
