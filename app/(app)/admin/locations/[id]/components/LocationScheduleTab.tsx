'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit2, Save, X, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { can } from '@/lib/permissions'

interface Location {
  id: string
  opening_hours?: any
  open_days?: string[]
}

interface Props {
  location: Location
}

const DAYS = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' },
]

export function LocationScheduleTab({ location }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [openingHours, setOpeningHours] = useState(location.opening_hours || {})
  const [openDays, setOpenDays] = useState<string[]>(location.open_days || [])
  const [loading, setLoading] = useState(false)
  const { permissions } = useAppStore()

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

      toast.success('Gli orari di apertura sono stati salvati con successo.')
      
      setIsEditing(false)
    } catch (error) {
      toast.error('Impossibile salvare gli orari. Riprova.')
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
            Orari di Apertura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map(day => (
              <div key={day.key} className="flex items-center justify-between border-b pb-2">
                <span className="font-medium">{day.label}</span>
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
                    'Chiuso'
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
          Orari di Apertura
        </CardTitle>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Modifica
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Salvataggio...' : 'Salva'}
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
                  {day.label}
                </Label>
              </div>
              
              {openDays.includes(day.key) && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label className="text-sm">Mattino</Label>
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
                    <Label className="text-sm">Pomeriggio</Label>
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