'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'
import { useEmployeeShifts } from '../hooks/useEmployeeShifts'
import { useMemo } from 'react'

interface WeeklyBreakdownTableProps {
  userId: string
  weekStart: Date
}

export function WeeklyBreakdownTable({ userId, weekStart }: WeeklyBreakdownTableProps) {
  const { t } = useTranslation()
  
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 })
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 })

  const { shifts, leaves, loading } = useEmployeeShifts(
    userId,
    weekStartDate.toISOString(),
    weekEndDate.toISOString()
  )

  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: weekStartDate, end: weekEndDate }),
    [weekStartDate, weekEndDate]
  )

  const dailyStats = useMemo(() => {
    return weekDays.map(day => {
      const dayShifts = shifts.filter(shift => 
        isSameDay(new Date(shift.startAt), day)
      )

      const dayLeaves = leaves.filter(leave => {
        const leaveStart = new Date(leave.startAt)
        const leaveEnd = new Date(leave.endAt)
        return day >= leaveStart && day <= leaveEnd
      })

      let totalHours = 0
      let breakMinutes = 0

      dayShifts.forEach(shift => {
        const duration = (new Date(shift.endAt).getTime() - new Date(shift.startAt).getTime()) / (1000 * 60 * 60)
        totalHours += duration
        breakMinutes += shift.breakMinutes
      })

      const netHours = totalHours - (breakMinutes / 60)

      return {
        day,
        shiftsCount: dayShifts.length,
        totalHours: Math.round(totalHours * 10) / 10,
        breakMinutes,
        netHours: Math.round(netHours * 10) / 10,
        hasLeave: dayLeaves.length > 0,
        leaveType: dayLeaves[0]?.type.label
      }
    })
  }, [weekDays, shifts, leaves])

  const weekTotals = useMemo(() => {
    return dailyStats.reduce((acc, day) => ({
      shifts: acc.shifts + day.shiftsCount,
      totalHours: acc.totalHours + day.totalHours,
      breakMinutes: acc.breakMinutes + day.breakMinutes,
      netHours: acc.netHours + day.netHours
    }), { shifts: 0, totalHours: 0, breakMinutes: 0, netHours: 0 })
  }, [dailyStats])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.shifts.weeklyBreakdown.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Riepilogo Settimanale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Giorno</TableHead>
              <TableHead className="text-center">Turni</TableHead>
              <TableHead className="text-right">Ore Totali</TableHead>
              <TableHead className="text-right">Pausa</TableHead>
              <TableHead className="text-right">Ore Nette</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyStats.map(({ day, shiftsCount, totalHours, breakMinutes, netHours, hasLeave, leaveType }) => (
              <TableRow key={day.toString()}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {format(day, 'EEEE', { locale: it })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(day, 'd MMM', { locale: it })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {hasLeave ? (
                    <span className="text-xs text-orange-600 font-medium">{leaveType}</span>
                  ) : (
                    shiftsCount
                  )}
                </TableCell>
                <TableCell className="text-right">{totalHours}h</TableCell>
                <TableCell className="text-right">{breakMinutes}min</TableCell>
                <TableCell className="text-right font-medium">{netHours}h</TableCell>
              </TableRow>
            ))}
            
            {/* Totals Row */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Totale Settimana</TableCell>
              <TableCell className="text-center">{weekTotals.shifts}</TableCell>
              <TableCell className="text-right">{Math.round(weekTotals.totalHours * 10) / 10}h</TableCell>
              <TableCell className="text-right">{weekTotals.breakMinutes}min</TableCell>
              <TableCell className="text-right">{Math.round(weekTotals.netHours * 10) / 10}h</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
