'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MyShiftsList } from './components/MyShiftsList'
import { MyAvailabilityPanel } from './components/MyAvailabilityPanel'
import { MyLeavePanel } from './components/MyLeavePanel'
import { useMyShifts } from './hooks/useMyShifts'
import { useMyAvailability } from './hooks/useMyAvailability'
import { useMyLeaveRequests } from './hooks/useMyLeaveRequests'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Clock, Palmtree } from 'lucide-react'

export function MyWeekClient() {
  const [activeTab, setActiveTab] = useState('shifts')
  const { shifts, loading: shiftsLoading, error: shiftsError, mutate: mutateShifts } = useMyShifts()
  const { availability, loading: availLoading, mutate: mutateAvail } = useMyAvailability()
  const { leaveRequests, loading: leaveLoading, mutate: mutateLeave } = useMyLeaveRequests()

  if (shiftsError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Errore nel caricamento dei dati: {shiftsError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">I miei Turni</h1>
        <p className="text-muted-foreground mt-1">
          Gestisci i tuoi turni, disponibilità e richieste di permesso
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>Turni</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Disponibilità</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Palmtree className="h-4 w-4" />
            <span>Permessi</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-6">
          {shiftsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <MyShiftsList shifts={shifts} onUpdate={mutateShifts} />
          )}
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          {availLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <MyAvailabilityPanel 
              availability={availability} 
              onUpdate={mutateAvail}
            />
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-6">
          {leaveLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <MyLeavePanel 
              leaveRequests={leaveRequests}
              onUpdate={mutateLeave}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
