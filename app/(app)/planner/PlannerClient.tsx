'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUnifiedRotaData } from './hooks/useUnifiedRotaData'
import { usePermissions } from '@/hooks/usePermissions'
import { WeekNavigator } from './components/WeekNavigator'
import { ShiftEditDialog } from './components/ShiftEditDialog'
import { EmployeeGridView } from './components/EmployeeGridView'
import { useConflictDetector } from './hooks/useConflictDetector'
import { getCurrentWeekStart } from '@/lib/shifts/week-utils'
import { useSupabase } from '@/hooks/useSupabase'
import type { Location, ShiftWithAssignments } from '@/types/shifts'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function PlannerClient() {
  const supabase = useSupabase()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(() => getCurrentWeekStart())
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<ShiftWithAssignments | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [jobTags, setJobTags] = useState<any[]>([])
  
  // Publish/Lock dialogs
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showLockDialog, setShowLockDialog] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [locking, setLocking] = useState(false)
  
  const { permissions, isLoading: permLoading } = usePermissions(selectedLocation || undefined)
  const { rota, shifts, leaves: rawLeaves, isLoading, mutate } = useUnifiedRotaData(selectedLocation, currentWeek)
  
  // Map leaves to expected type
  const leaves = useMemo(() => 
    rawLeaves.map(l => ({
      ...l,
      status: l.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
      org_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })), 
    [rawLeaves]
  )
  
  // Conflict detection
  const { conflicts, hasConflict, getConflicts } = useConflictDetector(shifts, leaves)

  // Load accessible locations on mount
  useEffect(() => {
    async function loadLocations() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: locsData } = await supabase
          .from('locations')
          .select('id, org_id, name, status')
          .eq('status', 'active')
          .order('name')

        if (locsData && locsData.length > 0) {
          setLocations(locsData)
          if (!selectedLocation) {
            setSelectedLocation(locsData[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading locations:', err)
        toast.error('Errore nel caricamento delle locations')
      } finally {
        setLocationsLoading(false)
      }
    }

    loadLocations()
  }, [supabase])

  // Load users and job tags when selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) {
      console.log('🔍 [Planner] No selectedLocation, skipping user load')
      return
    }

    async function loadUsersAndTags() {
      try {
        const location = locations.find(l => l.id === selectedLocation)
        if (!location) {
          console.log('🔍 [Planner] Location not found in state:', { selectedLocation, locations })
          return
        }

        console.log('🔍 [Planner] Loading users for location:', { 
          locationId: selectedLocation, 
          locationName: location.name,
          orgId: location.org_id 
        })

        // Fetch users with email from API endpoint
        const url = `/api/v1/admin/users?location_id=${selectedLocation}`
        console.log('🔍 [Planner] Fetching from:', url)
        
        const response = await fetch(url)
        console.log('🔍 [Planner] Response status:', response.status, response.statusText)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('🔍 [Planner] API Error:', { status: response.status, error: errorText })
          toast.error('Errore nel caricamento utenti')
          return
        }
        
        const responseData = await response.json()
        console.log('🔍 [Planner] Full API response:', responseData)
        
        const { users: usersData } = responseData
        console.log('🔍 [Planner] Users extracted:', { 
          count: usersData?.length || 0,
          users: usersData 
        })
        
        setUsers(usersData || [])

        // Load job tags for org
        if (location.org_id) {
          const { data: tagsData } = await supabase
            .from('job_tags')
            .select('id, key, label_it, color')
            .eq('org_id', location.org_id)
            .eq('is_active', true)

          setJobTags((tagsData || []).map(t => ({ 
            id: t.id,
            name: t.key,
            label: t.label_it || t.key,
            color: t.color 
          })))
        }
      } catch (err) {
        console.error('Error loading users and tags:', err)
        toast.error('Errore nel caricamento dati')
      }
    }

    loadUsersAndTags()
  }, [selectedLocation, locations, supabase])
  
  // Handle cell click to create new shift
  const handleCellClick = (userId: string, date: string) => {
    const user = users.find(u => u.id === userId)
    
    // Pre-fill shift with user and date
    setSelectedShift({
      id: 'new',
      rota_id: rota?.id || '',
      location_id: selectedLocation || '',
      org_id: locations.find(l => l.id === selectedLocation)?.org_id || '',
      start_at: `${date}T09:00:00`,
      end_at: `${date}T17:00:00`,
      break_minutes: 20,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      job_tag_id: null,
      job_tag: null,
      assignments: [{
        id: 'new',
        shift_id: 'new',
        user_id: userId,
        status: 'assigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org_id: '',
        user: user ? {
          id: user.id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          email: user.email
        } : null
      }]
    } as any)
  }
  
  // Publish rota
  const handlePublish = async () => {
    if (!rota) return
    
    setPublishing(true)
    try {
      const response = await fetch(`/api/v1/rotas/${rota.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Errore durante la pubblicazione')
        return
      }
      
      toast.success('Rota pubblicata con successo')
      mutate()
    } catch (error) {
      console.error('Error publishing rota:', error)
      toast.error('Errore durante la pubblicazione')
    } finally {
      setPublishing(false)
      setShowPublishDialog(false)
    }
  }
  
  // Lock rota
  const handleLock = async () => {
    if (!rota) return
    
    setLocking(true)
    try {
      const response = await fetch(`/api/v1/rotas/${rota.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' })
      })
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Errore durante il blocco')
        return
      }
      
      toast.success('Rota bloccata con successo')
      mutate()
    } catch (error) {
      console.error('Error locking rota:', error)
      toast.error('Errore durante il blocco')
    } finally {
      setLocking(false)
      setShowLockDialog(false)
    }
  }

  if (locationsLoading || permLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 p-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!permissions.includes('shifts:manage' as any) && !permissions.includes('*')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
          <p className="text-muted-foreground">
            Non hai i permessi necessari per accedere al planner turni.
          </p>
        </div>
      </div>
    )
  }

  const canPublish = rota?.status === 'draft'
  const canLock = rota?.status === 'published'

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <WeekNavigator 
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          rotaStatus={rota?.status}
          rotaId={rota?.id}
          onPublish={() => setShowPublishDialog(true)}
          onLock={() => setShowLockDialog(true)}
          canPublish={canPublish && !publishing}
          canLock={canLock && !locking}
        />
        
        {selectedLocation ? (
          <EmployeeGridView
            shifts={shifts}
            users={users}
            weekStart={currentWeek}
            onShiftClick={setSelectedShift}
            onCellClick={handleCellClick}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Seleziona una location dalla top bar</p>
          </div>
        )}
      </div>
      
      <ShiftEditDialog
        shift={selectedShift}
        open={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        onSave={mutate}
        jobTags={jobTags}
        users={users}
      />

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pubblicare la rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Una volta pubblicata, la rota sarà visibile a tutti i dipendenti.
              I manager potranno ancora modificare i turni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              Pubblica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock confirmation dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloccare la rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Una volta bloccata, la rota non potrà più essere modificata da nessuno.
              Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} className="bg-destructive text-destructive-foreground">
              Blocca Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
