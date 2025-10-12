'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/i18n'
import { format } from 'date-fns'
import { useState } from 'react'

// Phase 1 Components
import { MonthlyStatsCard } from './components/MonthlyStatsCard'
import { UpcomingShiftsCard } from './components/UpcomingShiftsCard'
import { ComplianceAlertsPanel } from './components/ComplianceAlertsPanel'
import { useEmployeeMonthlyStats } from './hooks/useEmployeeMonthlyStats'

// Phase 2 Components
import { ShiftsCalendar } from './components/ShiftsCalendar'

// Phase 3 Components
import { HoursChart } from './components/HoursChart'

interface ShiftsOverviewClientProps {
  employee: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  }
  currentUserId: string
}

export function ShiftsOverviewClient({ employee, currentUserId }: ShiftsOverviewClientProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const isOwnProfile = employee.id === currentUserId
  
  const [currentMonth] = useState(format(new Date(), 'yyyy-MM'))

  // Fetch monthly stats (Phase 1)
  const { monthlyStats, upcomingShifts, complianceAlerts, loading } = useEmployeeMonthlyStats(
    employee.id,
    currentMonth
  )

  // Mock data for Phase 3 - Hours Chart
  const mockWeeklyData = [
    { week: 'Sett 1', planned: 40, actual: 38 },
    { week: 'Sett 2', planned: 40, actual: 42 },
    { week: 'Sett 3', planned: 35, actual: 35 },
    { week: 'Sett 4', planned: 40, actual: 41 },
  ]

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/planner')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('employees.shifts.backToPlanner')}
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={employee.avatar_url || undefined} />
          <AvatarFallback className="text-lg">
            {employee.full_name?.[0]?.toUpperCase() || employee.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {employee.full_name || employee.email}
          </h1>
          <p className="text-muted-foreground">
            {t('employees.shifts.pageTitle')}
          </p>
        </div>
        {isOwnProfile && (
          <Badge variant="outline" className="bg-primary/10">
            {t('employees.shifts.yourProfile')}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="analytics">Analisi</TabsTrigger>
        </TabsList>

        {/* PHASE 1: Monthly Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Stats */}
          <MonthlyStatsCard stats={monthlyStats} loading={loading} />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upcoming Shifts */}
            <UpcomingShiftsCard shifts={upcomingShifts} loading={loading} />

            {/* Compliance Alerts */}
            <ComplianceAlertsPanel alerts={complianceAlerts} loading={loading} />
          </div>
        </TabsContent>

        {/* PHASE 2: Calendar & Timeline */}
        <TabsContent value="calendar" className="space-y-6">
          <ShiftsCalendar 
            userId={employee.id}
            onDayClick={(date) => {
              console.log('Day clicked:', date)
              // TODO: Open day detail modal
            }}
          />
        </TabsContent>

        {/* PHASE 3: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <HoursChart data={mockWeeklyData} />
          
          {/* Placeholder for future analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
              Shift Distribution (Coming Soon)
            </div>
            <div className="h-64 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
              Trend Analysis (Coming Soon)
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
