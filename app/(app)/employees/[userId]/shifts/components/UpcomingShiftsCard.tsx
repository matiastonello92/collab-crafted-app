'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface UpcomingShift {
  id: string
  startAt: string
  endAt: string
  breakMinutes: number
  locationName: string
  status: string
}

interface UpcomingShiftsCardProps {
  shifts: UpcomingShift[]
  loading: boolean
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
}

export function UpcomingShiftsCard({ shifts, loading }: UpcomingShiftsCardProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.shifts.upcomingShifts.title')}</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('employees.shifts.upcomingShifts.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {t('employees.shifts.upcomingShifts.noShifts')}
          </p>
        ) : (
          <div className="space-y-3">
            {shifts.slice(0, 5).map((shift) => {
              const startDate = new Date(shift.startAt)
              const endDate = new Date(shift.endAt)
              
              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(startDate, 'EEE d MMM', { locale: it })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shift.locationName}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[shift.status as keyof typeof STATUS_COLORS] || ''}
                  >
                    {t(`employees.shifts.status.${shift.status}`)}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
