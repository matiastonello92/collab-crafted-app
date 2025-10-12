'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/i18n'
import { format, startOfWeek } from 'date-fns'
import { useState } from 'react'

// Phase 1 Components
import { MonthlyStatsCard } from './components/MonthlyStatsCard'
import { UpcomingShiftsCard } from './components/UpcomingShiftsCard'
import { ComplianceAlertsPanel } from './components/ComplianceAlertsPanel'
import { useEmployeeMonthlyStats } from './hooks/useEmployeeMonthlyStats'

// Phase 2 Components
import { ShiftsCalendar } from './components/ShiftsCalendar'
import { DayDetailModal } from './components/DayDetailModal'
import { WeeklyBreakdownTable } from './components/WeeklyBreakdownTable'

// Phase 3 Components
import { HoursChart } from './components/HoursChart'
import { ShiftDistributionChart } from './components/ShiftDistributionChart'
import { TrendAnalysisCard } from './components/TrendAnalysisCard'

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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const currentMonthDate = new Date()
  const weekStart = startOfWeek(currentMonthDate, { weekStartsOn: 1 })

  // Fetch monthly stats (Phase 1)
  const { monthlyStats, upcomingShifts, complianceAlerts, loading } = useEmployeeMonthlyStats(
    employee.id,
    currentMonth
  )

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
            onDayClick={setSelectedDay}
          />
          
          <WeeklyBreakdownTable 
            userId={employee.id}
            weekStart={weekStart}
          />
        </TabsContent>

        {/* PHASE 3: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <TrendAnalysisCard 
            userId={employee.id}
            month={currentMonthDate}
          />
          
          <div className="grid gap-6 md:grid-cols-2">
            <ShiftDistributionChart 
              userId={employee.id}
              month={currentMonthDate}
            />
            <ComplianceAlertsPanel alerts={complianceAlerts} loading={loading} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Day Detail Modal */}
      <DayDetailModal 
        userId={employee.id}
        date={selectedDay}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  )
}
