'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import type { Availability } from '@/types/shifts'
import { toast } from 'sonner'
import { formatTimeRangeDisplay } from '@/lib/shifts/time-utils'
import { useTranslation } from '@/lib/i18n'

interface Props {
  availability: Availability[]
  onUpdate: () => void
}

export function MyAvailabilityPanel({ availability, onUpdate }: Props) {
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const [newEntry, setNewEntry] = useState({
    weekday: 1,
    start_time: '09:00',
    end_time: '17:00',
    preference: 'ok' as const
  })

  const WEEKDAYS = [
    { value: 1, label: t('myShifts.availability.monday') },
    { value: 2, label: t('myShifts.availability.tuesday') },
    { value: 3, label: t('myShifts.availability.wednesday') },
    { value: 4, label: t('myShifts.availability.thursday') },
    { value: 5, label: t('myShifts.availability.friday') },
    { value: 6, label: t('myShifts.availability.saturday') },
    { value: 0, label: t('myShifts.availability.sunday') },
  ]

  const PREFERENCES = [
    { value: 'preferred', label: t('myShifts.availability.preferred'), variant: 'default' as const },
    { value: 'ok', label: t('myShifts.availability.ok'), variant: 'secondary' as const },
    { value: 'unavailable', label: t('myShifts.availability.unavailable'), variant: 'destructive' as const },
  ]

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/v1/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
        credentials: 'include',
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(t('myShifts.toast.availabilityAdded'))
      setIsAdding(false)
      setNewEntry({ weekday: 1, start_time: '09:00', end_time: '17:00', preference: 'ok' })
      onUpdate()
    } catch (error) {
      toast.error(t('myShifts.toast.errorAvailabilityAdd'))
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/availability/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success(t('myShifts.toast.availabilityRemoved'))
      onUpdate()
    } catch (error) {
      toast.error(t('myShifts.toast.errorAvailabilityRemove'))
      console.error(error)
    }
  }

  // Group by weekday
  const byWeekday = availability.reduce((acc, avail) => {
    if (!acc[avail.weekday]) acc[avail.weekday] = []
    acc[avail.weekday].push(avail)
    return acc
  }, {} as Record<number, Availability[]>)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('myShifts.availability.title')}</CardTitle>
          <CardDescription>
            {t('myShifts.availability.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {WEEKDAYS.map(({ value, label }) => (
            <div key={value} className="space-y-2">
              <h4 className="font-medium">{label}</h4>
              <div className="space-y-2 pl-4">
                {byWeekday[value]?.map((avail) => {
                  const pref = PREFERENCES.find(p => p.value === avail.preference)
                  return (
                    <div key={avail.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatTimeRangeDisplay(avail.time_range)}
                        </span>
                        <Badge variant={pref?.variant || 'secondary'}>
                          {pref?.label || avail.preference}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDelete(avail.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
                {(!byWeekday[value] || byWeekday[value].length === 0) && (
                  <p className="text-sm text-muted-foreground">{t('myShifts.availability.noAvailability')}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('myShifts.availability.addTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('myShifts.availability.day')}</Label>
                <Select 
                  value={String(newEntry.weekday)} 
                  onValueChange={(v) => setNewEntry(prev => ({ ...prev, weekday: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map(day => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('myShifts.availability.preference')}</Label>
                <Select 
                  value={newEntry.preference} 
                  onValueChange={(v: any) => setNewEntry(prev => ({ ...prev, preference: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFERENCES.map(pref => (
                      <SelectItem key={pref.value} value={pref.value}>
                        {pref.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('myShifts.availability.startTime')}</Label>
                <input 
                  type="time" 
                  value={newEntry.start_time}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, start_time: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label>{t('myShifts.availability.endTime')}</Label>
                <input 
                  type="time" 
                  value={newEntry.end_time}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, end_time: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">{t('myShifts.availability.save')}</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)} className="flex-1">
                {t('myShifts.availability.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t('myShifts.availability.add')}
        </Button>
      )}
    </div>
  )
}
