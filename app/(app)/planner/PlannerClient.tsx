'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { WeekNavigator } from './components/WeekNavigator'
import { PlannerGrid } from './components/PlannerGrid'
import { PlannerSidebar, type PlannerFilters } from './components/PlannerSidebar'
import { ShiftEditDialog } from './components/ShiftEditDialog'
import { EmployeeGridView } from './components/EmployeeGridView'
import { useRotaData } from './hooks/useRotaData'
import { useConflictDetector } from './hooks/useConflictDetector'
import { getWeekBounds, getCurrentWeekStart } from '@/lib/shifts/week-utils'
import { useSupabase } from '@/hooks/useSupabase'
import type { Location } from '@/types/shifts'
import { Skeleton } from '@/components/ui/skeleton'

export function PlannerClient() {
  const supabase = useSupabase()
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(() => getCurrentWeekStart())
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'day' | 'employee'>('day')
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [jobTags, setJobTags] = useState<any[]>([])
  const [filters, setFilters] = useState<PlannerFilters>({
    jobTags: [],
    users: [],
    assignmentStatus: 'all',
    showLeave: true,
    showConflicts: true
  })
  
  const { permissions, isLoading: permLoading } = usePermissions(selectedLocation || undefined)
  const { rota, shifts, leaves, loading, error, mutate } = useRotaData(selectedLocation, currentWeek)
  
  // Conflict detection
  const { conflicts, hasConflict, getConflicts } = useConflictDetector(shifts, leaves)
  
  // Filter shifts based on active filters
  const filteredShifts = useMemo(() => {
    let result = shifts
    
    // Filter by job tags
    if (filters.jobTags.length > 0) {
      result = result.filter(s => filters.jobTags.includes(s.job_tag_id || ''))
    }
    
    // Filter by assignment status
    if (filters.assignmentStatus !== 'all') {
      result = result.filter(s => {
        const hasAssignment = s.assignments && s.assignments.length > 0
        if (filters.assignmentStatus === 'assigned') {
          return hasAssignment && s.assignments?.[0]?.status === 'assigned'
        }
        if (filters.assignmentStatus === 'unassigned') {
          return !hasAssignment
        }
        if (filters.assignmentStatus === 'pending') {
          return hasAssignment && s.assignments?.[0]?.status === 'proposed'
        }
        return true
      })
    }
    
    return result
  }, [shifts, filters])

  // Load accessible locations, users, and job tags
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load locations
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
        
        // Load users and job tags for the org
        if (selectedLocation) {
          const { data: usersData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, email')
            .limit(100)
          
          const { data: tagsData } = await supabase
            .from('job_tags')
            .select('id, key, label_it, color')
            .eq('is_active', true)
          
          setUsers(usersData || [])
          setJobTags((tagsData || []).map(t => ({ 
            id: t.id,
            name: t.key, 
            label: t.label_it || t.key,
            color: t.color 
          })))
        }
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLocationsLoading(false)
      }
    }

    loadData()
  }, [supabase, selectedLocation])

  if (locationsLoading || permLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-16 w-full mb-4" />
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

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        <PlannerSidebar 
          rota={rota}
          shifts={shifts}
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          onRefresh={mutate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onShiftClick={setSelectedShift}
          jobTags={jobTags}
          users={users}
          filters={filters}
          onFiltersChange={setFilters}
          currentWeekStart={currentWeek}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <WeekNavigator 
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
            rotaStatus={rota?.status}
          />
          
          {selectedLocation ? (
            viewMode === 'day' ? (
              <PlannerGrid 
                rota={rota}
                shifts={filteredShifts}
                leaves={filters.showLeave ? leaves : []}
                weekStart={currentWeek}
                locationId={selectedLocation}
                onRefresh={mutate}
                loading={loading}
                onShiftClick={setSelectedShift}
                conflicts={conflicts}
                showConflicts={filters.showConflicts}
              />
            ) : (
              <EmployeeGridView
                shifts={filteredShifts}
                users={users}
                weekStart={currentWeek}
                onShiftClick={setSelectedShift}
              />
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Seleziona una location</p>
            </div>
          )}
        </div>
      </div>
      
      <ShiftEditDialog
        shift={selectedShift}
        open={!!selectedShift}
        onClose={() => setSelectedShift(null)}
        onSave={mutate}
        jobTags={jobTags}
        users={users}
      />
    </>
  )
}
