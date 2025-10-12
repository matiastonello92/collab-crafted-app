'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useEmployeeShifts } from '../hooks/useEmployeeShifts'
import { startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, isSameWeek, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useMemo } from 'react'

interface TrendAnalysisCardProps {
  userId: string
  month: Date
}

export function TrendAnalysisCard({ userId, month }: TrendAnalysisCardProps) {
  const { t } = useTranslation()

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const { shifts, loading } = useEmployeeShifts(
    userId,
    monthStart.toISOString(),
    monthEnd.toISOString()
  )

  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    )

    return weeks.map(weekStartDate => {
      const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 })
      
      const weekShifts = shifts.filter(shift => 
        isSameWeek(new Date(shift.startAt), weekStartDate, { weekStartsOn: 1 })
      )

      let plannedHours = 0
      let actualHours = 0

      weekShifts.forEach(shift => {
        const duration = (new Date(shift.endAt).getTime() - new Date(shift.startAt).getTime()) / (1000 * 60 * 60)
        const breakHours = shift.breakMinutes / 60
        const netHours = duration - breakHours
        
        plannedHours += netHours
        // For now, actual = planned (will integrate timeclock later)
        actualHours += netHours
      })

      return {
        week: format(weekStartDate, 'dd MMM', { locale: it }),
        planned: Math.round(plannedHours * 10) / 10,
        actual: Math.round(actualHours * 10) / 10,
        shiftsCount: weekShifts.length
      }
    })
  }, [monthStart, monthEnd, shifts])

  const trends = useMemo(() => {
    if (weeklyData.length < 2) return null

    const avgPlanned = weeklyData.reduce((sum, w) => sum + w.planned, 0) / weeklyData.length
    const lastWeek = weeklyData[weeklyData.length - 1]
    const prevWeek = weeklyData[weeklyData.length - 2]

    const weeklyChange = lastWeek.planned - prevWeek.planned
    const weeklyChangePercent = prevWeek.planned > 0 
      ? ((weeklyChange / prevWeek.planned) * 100).toFixed(1)
      : '0'

    return {
      avgPlanned: Math.round(avgPlanned * 10) / 10,
      weeklyChange: Math.round(weeklyChange * 10) / 10,
      weeklyChangePercent,
      isPositive: weeklyChange >= 0
    }
  }, [weeklyData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analisi Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (weeklyData.every(w => w.planned === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analisi Trend Ore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Dati insufficienti per l'analisi del trend
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Analisi Trend Ore
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="planned" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Ore Programmate"
            />
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Ore Effettive"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Insights */}
        {trends && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Media Settimanale</p>
              <p className="text-2xl font-bold">{trends.avgPlanned}h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variazione Ultima Settimana</p>
              <p className={`text-2xl font-bold ${trends.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trends.isPositive ? '+' : ''}{trends.weeklyChange}h
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variazione %</p>
              <p className={`text-2xl font-bold ${trends.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trends.isPositive ? '+' : ''}{trends.weeklyChangePercent}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
