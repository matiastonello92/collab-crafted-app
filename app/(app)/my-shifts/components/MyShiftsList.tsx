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
  const [loading, setLoading] = useState<string | null>(null)

  const handleAccept = async (assignmentId: string) => {
    setLoading(assignmentId)
    try {
      const res = await fetch(`/api/v1/assignments/${assignmentId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true })
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(t('myShifts.toast.shiftAccepted'))
      onUpdate()
    } catch (error) {
      toast.error(t('myShifts.toast.errorAccept'))
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  const handleDecline = async (assignmentId: string) => {
    setLoading(assignmentId)
    try {
      const res = await fetch(`/api/v1/assignments/${assignmentId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: false })
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(t('myShifts.toast.shiftDeclined'))
      onUpdate()
    } catch (error) {
      toast.error(t('myShifts.toast.errorDecline'))
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  if (shifts.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {t('myShifts.shiftsList.noShifts')}
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
            {t('myShifts.shiftsList.weekOf')} {format(parseISO(weekStart), 'd MMMM yyyy', { locale: it })}
          </h3>
          <div className="space-y-3">
            {weekShifts.map((shift) => {
              const assignment = shift.assignments?.[0]
              const isPending = assignment?.status === 'proposed' || assignment?.status === 'assigned'
              
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
                              {t('myShifts.shiftsList.breakMinutes')}: {shift.break_minutes}{t('myShifts.shiftsList.min')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={
                            assignment?.status === 'accepted' ? 'default' : 
                            assignment?.status === 'declined' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {assignment?.status === 'accepted' && t('myShifts.shiftsList.statusAccepted')}
                          {assignment?.status === 'declined' && t('myShifts.shiftsList.statusDeclined')}
                          {assignment?.status === 'assigned' && t('myShifts.shiftsList.statusAssigned')}
                          {assignment?.status === 'proposed' && t('myShifts.shiftsList.statusProposed')}
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

                  {isPending && assignment && (
                    <CardContent className="pt-0">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleAccept(assignment.id)}
                          disabled={loading === assignment.id}
                          className="flex-1"
                        >
                          {loading === assignment.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              {t('myShifts.shiftsList.accept')}
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDecline(assignment.id)}
                          disabled={loading === assignment.id}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t('myShifts.shiftsList.decline')}
                        </Button>
                      </div>
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
