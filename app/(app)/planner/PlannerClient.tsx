'use client'

import { useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { WeekNavigator } from './components/WeekNavigator'
import { PlannerGrid } from './components/PlannerGrid'
import { PlannerSidebar } from './components/PlannerSidebar'
import { useRotaData } from './hooks/useRotaData'
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
  
  const { permissions, isLoading: permLoading } = usePermissions(selectedLocation || undefined)
  const { rota, shifts, loading, error, mutate } = useRotaData(selectedLocation, currentWeek)

  // Load accessible locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get locations where user has shifts:manage permission
        const { data } = await supabase
          .from('locations')
          .select('id, org_id, name, status')
          .eq('status', 'active')
          .order('name')

        if (data && data.length > 0) {
          setLocations(data)
          // Auto-select first location
          if (!selectedLocation) {
            setSelectedLocation(data[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading locations:', err)
      } finally {
        setLocationsLoading(false)
      }
    }

    loadLocations()
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar filtri */}
      <PlannerSidebar 
        rota={rota}
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        onRefresh={mutate}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <WeekNavigator 
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          rotaStatus={rota?.status}
        />
        
        {selectedLocation ? (
          <PlannerGrid 
            rota={rota}
            shifts={shifts}
            weekStart={currentWeek}
            locationId={selectedLocation}
            onRefresh={mutate}
            loading={loading}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">
              Seleziona una location per iniziare
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
