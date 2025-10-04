'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUnifiedRotaData } from './hooks/useUnifiedRotaData'
import { usePermissions } from '@/hooks/usePermissions'
import { useHydratedLocationContext, useHydratedOrgId } from '@/lib/store/useHydratedStore'
import { WeekNavigator } from './components/WeekNavigator'
import { ShiftEditDialog } from './components/ShiftEditDialog'
import { EmployeeGridView } from './components/EmployeeGridView'
import { useConflictDetector } from './hooks/useConflictDetector'
import { getCurrentWeekStart } from '@/lib/shifts/week-utils'
import { useSupabase } from '@/hooks/useSupabase'
import type { Location, ShiftWithAssignments } from '@/types/shifts'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
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
  const { t } = useTranslation()
  const supabase = useSupabase()
  const { location_id: selectedLocation } = useHydratedLocationContext()
  const orgId = useHydratedOrgId()
  const [currentWeek, setCurrentWeek] = useState(() => getCurrentWeekStart())
  const [selectedShift, setSelectedShift] = useState<ShiftWithAssignments | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [jobTags, setJobTags] = useState<any[]>([])
  const [showUsersWithoutShifts, setShowUsersWithoutShifts] = useState(true)
  
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

  // Load users and job tags when selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) {
      console.log('🔍 [Planner] No selectedLocation, skipping user load')
      return
    }

    async function loadUsersAndTags() {
      try {
        console.log('🔍 [Planner] Loading users for location:', selectedLocation)

        // Fetch users with email from API endpoint
        const url = `/api/v1/admin/users?location_id=${selectedLocation}`
        console.log('🔍 [Planner] Fetching from:', url)
        
        const response = await fetch(url)
        console.log('🔍 [Planner] Response status:', response.status, response.statusText)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('🔍 [Planner] API Error:', { status: response.status, error: errorText })
          toast.error(t('planner.toast.userLoadError'))
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
        if (orgId) {
          const { data: tagsData } = await supabase
            .from('job_tags')
            .select('id, key, label_it, color')
            .eq('org_id', orgId)
            .eq('is_active', true)

          setJobTags((tagsData || []).map(t => ({ 
            id: t.id,
            key: t.key,
            label_it: t.label_it,
            color: t.color || null,
            categoria: null
          })))
        }
      } catch (err) {
        console.error('Error loading users and tags:', err)
        toast.error(t('planner.toast.dataLoadError'))
      }
    }

    loadUsersAndTags()
  }, [selectedLocation, orgId, supabase])
  
  // Handle cell click to create new shift
  const handleCellClick = (userId: string, date: string) => {
    if (!selectedLocation) {
      toast.error(t('planner.toast.noActiveLocation'))
      return
    }

    const user = users.find(u => u.id === userId)
    
    // Pre-fill shift with user and date
    // Backend will auto-create rota if needed using location_id
    setSelectedShift({
      id: 'new',
      rota_id: rota?.id || undefined,
      location_id: selectedLocation,
      org_id: orgId || '',
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
        toast.error(error.message || t('planner.toast.errorPublishing'))
        return
      }
      
      toast.success(t('planner.toast.rotaPublished'))
      mutate()
    } catch (error) {
      console.error('Error publishing rota:', error)
      toast.error(t('planner.toast.errorPublishing'))
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
        toast.error(error.message || t('planner.toast.errorLocking'))
        return
      }
      
      toast.success(t('planner.toast.rotaLocked'))
      mutate()
    } catch (error) {
      console.error('Error locking rota:', error)
      toast.error(t('planner.toast.errorLocking'))
    } finally{
      setLocking(false)
      setShowLockDialog(false)
    }
  }

  if (permLoading || !selectedLocation) {
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
          <h2 className="text-xl font-semibold mb-2">{t('planner.permissions.accessDenied')}</h2>
          <p className="text-muted-foreground">
            {t('planner.permissions.noPermission')}
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
          showUsersWithoutShifts={showUsersWithoutShifts}
          onToggleUsersWithoutShifts={setShowUsersWithoutShifts}
        />
        
        {selectedLocation ? (
          <EmployeeGridView
            shifts={shifts}
            leaves={rawLeaves}
            users={users}
            weekStart={currentWeek}
            onShiftClick={setSelectedShift}
            onCellClick={handleCellClick}
            showUsersWithoutShifts={showUsersWithoutShifts}
            onSave={mutate}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">{t('planner.placeholders.selectLocation')}</p>
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
            <AlertDialogTitle>{t('planner.publish.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planner.publish.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              {t('planner.common.publishRota')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock confirmation dialog */}
      <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('planner.publish.titleLock')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('planner.publish.descriptionLock')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} className="bg-destructive text-destructive-foreground">
              {t('planner.publish.lockPermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
