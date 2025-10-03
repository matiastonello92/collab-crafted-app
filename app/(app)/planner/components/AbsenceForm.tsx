'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLeaveTypes, type LeaveType } from '@/app/(app)/my-shifts/hooks/useLeaveTypes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/types/shifts'

interface AbsenceFormProps {
  users: UserProfile[]
  date: string
  locationId: string
  onSuccess: () => void
  onCancel: () => void
}

type TimeSlot = 'morning' | 'afternoon' | 'full_day'

export function AbsenceForm({ users, date, locationId, onSuccess, onCancel }: AbsenceFormProps) {
  const { leaveTypes, loading: loadingTypes } = useLeaveTypes()
  const [leaveTypeId, setLeaveTypeId] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('full_day')
  const [startDate, setStartDate] = useState(date)
  const [endDate, setEndDate] = useState(date)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedLeaveType = leaveTypes.find((lt: LeaveType) => lt.id === leaveTypeId)
  const isWeeklyRest = selectedLeaveType?.key === 'weekly_rest'
  const isPaidLeave = selectedLeaveType?.key === 'paid_leave'

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const getTimeRange = (slot: TimeSlot) => {
    const baseStartDate = new Date(startDate)
    const baseEndDate = new Date(endDate)
    
    switch (slot) {
      case 'morning':
        return {
          start_at: new Date(baseStartDate.setHours(0, 0, 0, 0)).toISOString(),
          end_at: new Date(baseEndDate.setHours(12, 0, 0, 0)).toISOString()
        }
      case 'afternoon':
        return {
          start_at: new Date(baseStartDate.setHours(12, 0, 0, 0)).toISOString(),
          end_at: new Date(baseEndDate.setHours(23, 59, 59, 999)).toISOString()
        }
      case 'full_day':
      default:
        return {
          start_at: new Date(baseStartDate.setHours(0, 0, 0, 0)).toISOString(),
          end_at: new Date(baseEndDate.setHours(23, 59, 59, 999)).toISOString()
        }
    }
  }

  const handleSubmit = async () => {
    if (!leaveTypeId) {
      toast.error('Seleziona un tipo di assenza')
      return
    }
    if (selectedUsers.size === 0) {
      toast.error('Seleziona almeno un utente')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La data di fine deve essere successiva o uguale alla data di inizio')
      return
    }

    setSubmitting(true)
    try {
      const { start_at, end_at } = getTimeRange(timeSlot)
      const userIds = Array.from(selectedUsers)

      // Create definitive leave for each selected user (manager action)
      const promises = userIds.map(userId =>
        fetch('/api/v1/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            type_id: leaveTypeId,
            location_id: locationId,
            start_at,
            end_at,
            reason: notes || undefined,
          })
        })
      )

      const results = await Promise.all(promises)
      const failed = results.filter(r => !r.ok)

      if (failed.length > 0) {
        const firstError = await failed[0].json()
        if (firstError.error === 'LEAVE_COLLISION') {
          toast.error('Esiste già un\'assenza per uno o più utenti in questo periodo. Rimuovi quella esistente o scegli un altro giorno.')
        } else {
          toast.error(`${failed.length} assenze non sono state create: ${firstError.message || firstError.error}`)
        }
      } else {
        toast.success(`${userIds.length} assenza/e create con successo`)
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating absences:', error)
      toast.error('Errore durante la creazione delle assenze')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 py-4">
      {/* Date Range Selection */}
      <div className="space-y-2">
        <Label className="font-medium text-foreground">Periodo Assenza</Label>
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data Inizio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    "bg-background"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(parseISO(startDate), 'dd MMM yyyy', { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(startDate)}
                  onSelect={(d) => d && setStartDate(d.toISOString().split('T')[0])}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data Fine</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    "bg-background"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(parseISO(endDate), 'dd MMM yyyy', { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(endDate)}
                  onSelect={(d) => d && setEndDate(d.toISOString().split('T')[0])}
                  disabled={(date) => date < parseISO(startDate)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Leave Type */}
      <div className="space-y-2">
        <Label className="font-medium text-foreground">Tipo di Assenza</Label>
        <Select value={leaveTypeId} onValueChange={setLeaveTypeId} disabled={loadingTypes}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Seleziona tipo..." />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes
              .filter((lt: LeaveType) => lt.key === 'weekly_rest' || lt.key === 'paid_leave')
              .map((type: LeaveType) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: type.color || '#888' }}
                    />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Slot - Only for weekly rest */}
      {isWeeklyRest && (
        <div className="space-y-2">
          <Label className="font-medium text-foreground">Periodo</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={timeSlot === 'morning' ? 'default' : 'outline'}
              onClick={() => setTimeSlot('morning')}
              className="w-full"
            >
              Mattina
            </Button>
            <Button
              type="button"
              variant={timeSlot === 'afternoon' ? 'default' : 'outline'}
              onClick={() => setTimeSlot('afternoon')}
              className="w-full"
            >
              Pomeriggio
            </Button>
            <Button
              type="button"
              variant={timeSlot === 'full_day' ? 'default' : 'outline'}
              onClick={() => setTimeSlot('full_day')}
              className="w-full"
            >
              Giornata
            </Button>
          </div>
        </div>
      )}

      {isPaidLeave && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          Il congedo retribuito è sempre per la giornata intera
        </div>
      )}

      {/* User Selection */}
      <div className="space-y-2">
        <Label className="font-medium text-foreground">
          Seleziona Utenti ({selectedUsers.size})
        </Label>
        <ScrollArea className="h-[200px] rounded-md border bg-background">
          <div className="p-4 space-y-2">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => toggleUser(user.id)}
              >
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onCheckedChange={() => toggleUser(user.id)}
                />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.full_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.full_name || user.email}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="font-medium text-foreground">Note</Label>
        <Textarea
          className="bg-background"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aggiungi note..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !leaveTypeId || selectedUsers.size === 0}>
          {submitting ? 'Creazione...' : 'Crea Assenza'}
        </Button>
      </div>
    </div>
  )
}
