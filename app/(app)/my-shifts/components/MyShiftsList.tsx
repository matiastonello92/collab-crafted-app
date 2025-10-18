'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Check, X, RefreshCw, Clock } from 'lucide-react'
import type { ShiftWithAssignments } from '@/types/shifts'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

interface Props {
  shifts: ShiftWithAssignments[]
  onUpdate: () => void
}

export function MyShiftsList({ shifts, onUpdate }: Props) {
  const { t } = useTranslation()

  if (shifts.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {t('myShifts.shifts.noShifts')}
        </AlertDescription>
      </Alert>
    )
  }

  // Group by week
  const shiftsByWeek = shifts.reduce((acc, shift) => {
    const weekKey = shift.rota?.week_start_date || 'unknown'
    if (!acc[weekKey]) acc[weekKey] = []
    acc[weekKey].push(shift)
    return acc
  }, {} as Record<string, ShiftWithAssignments[]>)

  return (
    <div className="space-y-6">
      {Object.entries(shiftsByWeek).map(([weekStart, weekShifts]) => (
        <div key={weekStart}>
          <h3 className="text-lg font-semibold mb-3">
            {t('myShifts.shifts.week')} {format(parseISO(weekStart), 'd MMMM yyyy', { locale: it })}
          </h3>
          <div className="space-y-3">
            {weekShifts.map((shift) => {
              const assignment = shift.assignments?.[0]
              
              return (
                <Card key={shift.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {format(parseISO(shift.start_at), 'EEEE d MMMM', { locale: it })}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(shift.start_at), 'HH:mm')} - {format(parseISO(shift.end_at), 'HH:mm')}
                          </span>
                          {shift.break_minutes > 0 && (
                            <span className="text-xs">
                              {t('myShifts.shifts.breakMinutes')}: {shift.break_minutes}{t('myShifts.shifts.min')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
              <Badge variant="default">
                {t('myShifts.shifts.status.assigned')}
              </Badge>
                        {shift.job_tag && (
                          <Badge variant="outline">{shift.job_tag.label_it}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {shift.notes && (
                    <CardContent className="pb-3 pt-0">
                      <p className="text-sm text-muted-foreground">{shift.notes}</p>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
