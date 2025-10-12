'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Coffee, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'
import { useEmployeeShifts } from '../hooks/useEmployeeShifts'

interface DayDetailModalProps {
  userId: string
  date: Date | null
  onClose: () => void
}

export function DayDetailModal({ userId, date, onClose }: DayDetailModalProps) {
  const { t } = useTranslation()
  
  const dayStart = date ? new Date(date.setHours(0, 0, 0, 0)).toISOString() : ''
  const dayEnd = date ? new Date(date.setHours(23, 59, 59, 999)).toISOString() : ''

  const { shifts, leaves, loading } = useEmployeeShifts(userId, dayStart, dayEnd)

  const dayShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startAt)
    return date && shiftDate.toDateString() === date.toDateString()
  })

  const dayLeaves = leaves.filter(leave => {
    const leaveStart = new Date(leave.startAt)
    const leaveEnd = new Date(leave.endAt)
    return date && date >= leaveStart && date <= leaveEnd
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  return (
    <Dialog open={!!date} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {date && format(date, 'EEEE d MMMM yyyy', { locale: it })}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Leaves Section */}
            {dayLeaves.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Permessi/Ferie</h3>
                <div className="space-y-2">
                  {dayLeaves.map(leave => (
                    <div
                      key={leave.id}
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: leave.type.color ? `${leave.type.color}15` : undefined,
                        borderColor: leave.type.color || undefined
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{leave.type.label}</Badge>
                          <span className="text-sm">
                            {format(new Date(leave.startAt), 'HH:mm')} - {format(new Date(leave.endAt), 'HH:mm')}
                          </span>
                        </div>
                        <Badge variant={leave.status === 'approved' ? 'default' : 'secondary'}>
                          {t(`employees.shifts.status.${leave.status}` as any) || leave.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shifts Section */}
            {dayShifts.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold mb-3">Turni</h3>
                <div className="space-y-3">
                  {dayShifts.map(shift => {
                    const startTime = new Date(shift.startAt)
                    const endTime = new Date(shift.endAt)
                    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
                    const netHours = duration - (shift.breakMinutes / 60)

                    return (
                      <div key={shift.id} className="p-4 rounded-lg border bg-card space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(shift.status)}
                            <span className="font-medium">
                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {t(`employees.shifts.status.${shift.status}` as any) || shift.status}
                          </Badge>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {shift.locationName}
                        </div>

                        {/* Duration & Break */}
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Durata</p>
                            <p className="text-sm font-medium">{duration.toFixed(1)}h</p>
                          </div>
                          {shift.breakMinutes > 0 && (
                            <div className="flex items-center gap-1">
                              <Coffee className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Pausa</p>
                                <p className="text-sm font-medium">{shift.breakMinutes}min</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Ore Nette</p>
                            <p className="text-sm font-medium">{netHours.toFixed(1)}h</p>
                          </div>
                        </div>

                        {/* Acceptance/Decline timestamps */}
                        {shift.acceptedAt && (
                          <div className="text-xs text-muted-foreground">
                            Accettato il {format(new Date(shift.acceptedAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        )}
                        {shift.declinedAt && (
                          <div className="text-xs text-red-600">
                            Rifiutato il {format(new Date(shift.declinedAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : dayLeaves.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nessun turno o permesso registrato per questo giorno
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
