'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface MonthlyStatsCardProps {
  stats: {
    plannedHours: number
    actualHours: number
    variance: number
    overtimeHours: number
    shiftsCount: number
    leaveDays: number
  } | null
  loading: boolean
}

export function MonthlyStatsCard({ stats, loading }: MonthlyStatsCardProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.shifts.monthlyStats.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}...
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const varianceColor = stats.variance >= 0 ? 'text-green-600' : 'text-red-600'
  const VarianceIcon = stats.variance >= 0 ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('employees.shifts.monthlyStats.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('employees.shifts.monthlyStats.planned')}
            </p>
            <p className="text-2xl font-bold">{stats.plannedHours}h</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('employees.shifts.monthlyStats.actual')}
            </p>
            <p className="text-2xl font-bold">{stats.actualHours}h</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('employees.shifts.monthlyStats.variance')}
            </p>
            <p className={`text-2xl font-bold flex items-center gap-1 ${varianceColor}`}>
              <VarianceIcon className="h-5 w-5" />
              {stats.variance > 0 ? '+' : ''}{stats.variance}h
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('employees.shifts.monthlyStats.overtime')}
            </p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.overtimeHours}h
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('employees.shifts.monthlyStats.shifts')}
              </p>
              <p className="text-lg font-semibold">{stats.shiftsCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('employees.shifts.monthlyStats.leaveDays')}
              </p>
              <p className="text-lg font-semibold">{stats.leaveDays}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
