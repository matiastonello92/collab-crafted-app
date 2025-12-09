'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MyShiftsList } from './components/MyShiftsList'
import { MyAvailabilityPanel } from './components/MyAvailabilityPanel'
import { MyLeavePanel } from './components/MyLeavePanel'
import { useMyShifts } from './hooks/useMyShifts'
import { useMyAvailability } from './hooks/useMyAvailability'
import { useMyLeaveRequests } from './hooks/useMyLeaveRequests'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Clock, Palmtree } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useBreakpoint } from '@/hooks/useBreakpoint'

export function MyWeekClient() {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const [activeTab, setActiveTab] = useState('shifts')
  const { shifts, loading: shiftsLoading, error: shiftsError, mutate: mutateShifts } = useMyShifts()
  const { availability, loading: availLoading, mutate: mutateAvail } = useMyAvailability()
  const { leaveRequests, loading: leaveLoading, mutate: mutateLeave } = useMyLeaveRequests()

  if (shiftsError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {t('common.messages.errorLoadingData')}: {shiftsError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('myShifts.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('myShifts.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full min-h-[44px] mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shifts">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {t('myShifts.tabs.shifts')}
                </span>
              </SelectItem>
              <SelectItem value="availability">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('myShifts.tabs.availability')}
                </span>
              </SelectItem>
              <SelectItem value="leave">
                <span className="flex items-center gap-2">
                  <Palmtree className="h-4 w-4" />
                  {t('myShifts.tabs.leave')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>{t('myShifts.tabs.shifts')}</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{t('myShifts.tabs.availability')}</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-2">
              <Palmtree className="h-4 w-4" />
              <span>{t('myShifts.tabs.leave')}</span>
            </TabsTrigger>
          </TabsList>
        )}

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
