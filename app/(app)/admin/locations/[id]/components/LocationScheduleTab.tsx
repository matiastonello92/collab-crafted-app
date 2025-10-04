'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit2, Save, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useHydratedStore } from '@/lib/store/useHydratedStore'
import { can } from '@/lib/permissions'
import { useTranslation } from '@/lib/i18n'

interface Location {
  id: string
  opening_hours?: any
  open_days?: string[]
}

interface Props {
  location: Location
}

const DAYS = [
  { key: 'monday' },
  { key: 'tuesday' },
  { key: 'wednesday' },
  { key: 'thursday' },
  { key: 'friday' },
  { key: 'saturday' },
  { key: 'sunday' },
]

export function LocationScheduleTab({ location }: Props) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [openingHours, setOpeningHours] = useState(location.opening_hours || {})
  const [openDays, setOpenDays] = useState<string[]>(location.open_days || [])
  const [loading, setLoading] = useState(false)
  const { permissions } = useHydratedStore()

  const isAdmin = can(permissions, '*')
  const canEdit = isAdmin || can(permissions, 'locations:manage')

  useEffect(() => {
    setOpeningHours(location.opening_hours || {})
    setOpenDays(location.open_days || [])
  }, [location])

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/admin/locations/${location.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_hours: openingHours,
          open_days: openDays,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update schedule')
      }

      toast.success(t('toast.location.scheduleUpdated'))
      
      setIsEditing(false)
    } catch (error) {
      toast.error(t('toast.location.errorUpdatingSchedule'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setOpeningHours(location.opening_hours || {})
    setOpenDays(location.open_days || [])
    setIsEditing(false)
  }

  const handleHourChange = (day: string, period: 'morning' | 'afternoon', field: 'start' | 'end', value: string) => {
    setOpeningHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          ...prev[day]?.[period],
          [field]: value
        }
      }
    }))
  }

  const toggleDay = (day: string, checked: boolean) => {
    if (checked) {
      setOpenDays(prev => [...prev, day])
    } else {
      setOpenDays(prev => prev.filter(d => d !== day))
    }
  }

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('admin.locationScheduleTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map(day => (
              <div key={day.key} className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">{t(`admin.day${day.key.charAt(0).toUpperCase() + day.key.slice(1)}`)}</span>
                <div className="text-sm text-muted-foreground">
                  {openDays.includes(day.key) ? (
                    <div className="space-x-4">
                      <span>
                        {openingHours[day.key]?.morning?.start || '09:00'} - {openingHours[day.key]?.morning?.end || '12:00'}
                      </span>
                      <span>
                        {openingHours[day.key]?.afternoon?.start || '14:00'} - {openingHours[day.key]?.afternoon?.end || '18:00'}
                      </span>
                    </div>
                  ) : (
                    t('admin.locationScheduleClosed')
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('admin.locationScheduleTitle')}
        </CardTitle>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            {t('admin.locationScheduleEdit')}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              {t('admin.locationScheduleCancel')}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? t('admin.locationScheduleSaving') : t('admin.locationScheduleSave')}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {DAYS.map(day => (
            <div key={day.key} className="space-y-3 border-b pb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={day.key}
                  checked={openDays.includes(day.key)}
                  onCheckedChange={(checked) => toggleDay(day.key, checked as boolean)}
                  disabled={!isEditing}
                />
                <Label htmlFor={day.key} className="font-medium">
                  {t(`admin.day${day.key.charAt(0).toUpperCase() + day.key.slice(1)}`)}
                </Label>
              </div>
              
              {openDays.includes(day.key) && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label className="text-sm">{t('admin.locationScheduleMorning')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={openingHours[day.key]?.morning?.start || '09:00'}
                        onChange={(e) => handleHourChange(day.key, 'morning', 'start', e.target.value)}
                        disabled={!isEditing}
                      />
                      <Input
                        type="time"
                        value={openingHours[day.key]?.morning?.end || '12:00'}
                        onChange={(e) => handleHourChange(day.key, 'morning', 'end', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('admin.locationScheduleAfternoon')}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={openingHours[day.key]?.afternoon?.start || '14:00'}
                        onChange={(e) => handleHourChange(day.key, 'afternoon', 'start', e.target.value)}
                        disabled={!isEditing}
                      />
                      <Input
                        type="time"
                        value={openingHours[day.key]?.afternoon?.end || '18:00'}
                        onChange={(e) => handleHourChange(day.key, 'afternoon', 'end', e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}