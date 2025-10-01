'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store/unified'

interface Location {
  id: string
  name: string
  org_id: string
}

interface JobTag {
  id: string
  label_it: string
  key: string
  color?: string
}

interface User {
  id: string
  full_name: string
  email: string
  primary_job_tag_label?: string
  primary_job_tag_color?: string
}

interface Shift {
  id: string
  start_at: string
  end_at: string
  break_minutes: number
  notes?: string
  job_tag_id?: string
  assigned_user_id?: string
}

export function useWizardData() {
  // Global context (like inventory modules)
  const rawLocationId = useAppStore(state => state.context.location_id)
  const locationId = rawLocationId === 'null' || !rawLocationId ? undefined : rawLocationId
  const orgId = useAppStore(state => state.context.org_id)
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  const [locations, setLocations] = useState<Location[]>([])
  const [jobTags, setJobTags] = useState<JobTag[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/locations')
      if (!res.ok) throw new Error('Failed to fetch locations')
      const data = await res.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Errore nel caricamento delle location')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchJobTags = useCallback(async (orgId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/job-tags?org_id=${orgId}&is_active=true`)
      if (!res.ok) throw new Error('Failed to fetch job tags')
      const data = await res.json()
      setJobTags(data.jobTags || [])
    } catch (error) {
      console.error('Error fetching job tags:', error)
      toast.error('Errore nel caricamento dei ruoli')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async (locationId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/users/location?location_id=${locationId}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Errore nel caricamento degli utenti')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchShifts = useCallback(async (rotaId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/shifts?rota_id=${rotaId}`)
      if (!res.ok) throw new Error('Failed to fetch shifts')
      const data = await res.json()
      setShifts(data.shifts || [])
    } catch (error) {
      console.error('Error fetching shifts:', error)
      toast.error('Errore nel caricamento dei turni')
    } finally {
      setLoading(false)
    }
  }, [])

  // Wait for hydration before fetching locations
  useEffect(() => {
    if (hasHydrated && !locations.length) {
      console.log('[useWizardData] Store hydrated, fetching locations. Context:', { locationId, orgId })
      fetchLocations()
    } else if (!hasHydrated) {
      console.log('[useWizardData] Waiting for store hydration...')
    }
  }, [hasHydrated, locations.length, fetchLocations, locationId, orgId])

  return {
    locationId,
    orgId,
    hasHydrated,
    locations,
    jobTags,
    users,
    shifts,
    loading,
    fetchLocations,
    fetchJobTags,
    fetchUsers,
    fetchShifts,
    setShifts,
  }
}
