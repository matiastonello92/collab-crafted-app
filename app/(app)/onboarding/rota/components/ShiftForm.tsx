'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserSelector } from '@/components/onboarding/UserSelector'
import { ShiftTimeField } from '@/components/onboarding/ShiftTimeField'
import { toast } from 'sonner'
import { format, addDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { useTranslation } from '@/lib/i18n'

interface JobTag {
  id: string
  label_it: string
  color?: string
}

interface User {
  id: string
  full_name: string
  email: string
  primary_job_tag_label?: string
  primary_job_tag_color?: string
}

interface Shift {
  id: string
  start_at: string
  end_at: string
  break_minutes: number
  notes?: string
  job_tag_id?: string
}

interface ShiftFormProps {
  rotaId: string
  weekStart: string
  jobTags: JobTag[]
  users: User[]
  editingShift?: Shift | null
  onSuccess: () => void
  onCancel: () => void
}

export function ShiftForm({
  rotaId,
  weekStart,
  jobTags,
  users,
  editingShift,
  onSuccess,
  onCancel,
}: ShiftFormProps) {
  const { t } = useTranslation()
  const [dayOfWeek, setDayOfWeek] = useState('0')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [jobTagId, setJobTagId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(parseISO(weekStart), i)
    return {
      value: i.toString(),
      label: format(date, 'EEEE d MMM', { locale: it }),
      date: format(date, 'yyyy-MM-dd'),
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!jobTagId) {
      toast.error(t('onboarding.shiftForm.validation.selectRole'))
      return
    }

    const selectedDay = weekDays.find((d) => d.value === dayOfWeek)
    if (!selectedDay) return

    const startAt = `${selectedDay.date}T${startTime}:00+02:00`
    const endAt = `${selectedDay.date}T${endTime}:00+02:00`

    if (new Date(endAt) <= new Date(startAt)) {
      toast.error(t('onboarding.shiftForm.validation.endTimeAfterStart'))
      return
    }

    setSubmitting(true)
    try {
      // Create shift(s)
      const shiftData = {
        rota_id: rotaId,
        job_tag_id: jobTagId,
        start_at: startAt,
        end_at: endAt,
        break_minutes: parseInt(breakMinutes, 10),
        notes: notes || undefined,
        quantity: parseInt(quantity, 10),
      }

      const res = await fetch('/api/v1/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData),
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || t('onboarding.shiftForm.toast.errorCreating'))
      }

      const data = await res.json()

      // If user assigned, assign to shift
      if (assignedUserId && data.shift) {
        await fetch(`/api/v1/shifts/${data.shift.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: assignedUserId,
            status: 'assigned',
          }),
          credentials: 'include',
        })
      }

      const successMessage = parseInt(quantity) > 1 
        ? t('onboarding.shiftForm.toast.shiftCreated').replace('Turno', 'Turni')
        : t('onboarding.shiftForm.toast.shiftCreated')
      toast.success(successMessage)
      onSuccess()
    } catch (error: any) {
      console.error('Error creating shift:', error)
      toast.error(error.message || t('onboarding.shiftForm.toast.errorCreating'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('onboarding.shiftForm.labels.day')}</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weekDays.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('onboarding.shiftForm.labels.role')}</Label>
          <Select value={jobTagId} onValueChange={setJobTagId}>
            <SelectTrigger>
              <SelectValue placeholder={t('onboarding.shiftForm.placeholders.selectRole')} />
            </SelectTrigger>
            <SelectContent>
              {jobTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.label_it}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ShiftTimeField
          label={t('onboarding.shiftForm.labels.startTime')}
          value={startTime}
          onChange={setStartTime}
        />

        <ShiftTimeField
          label={t('onboarding.shiftForm.labels.endTime')}
          value={endTime}
          onChange={setEndTime}
        />

        <div className="space-y-2">
          <Label>{t('onboarding.shiftForm.labels.breakMinutes')}</Label>
          <Input
            type="number"
            min="0"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('onboarding.shiftForm.labels.quantity')}</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('onboarding.shiftForm.labels.assignTo')}</Label>
        <UserSelector
          users={users}
          value={assignedUserId}
          onValueChange={setAssignedUserId}
          placeholder={t('onboarding.shiftForm.placeholders.noAssignment')}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('onboarding.shiftForm.labels.notes')}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('onboarding.shiftForm.placeholders.additionalNotes')}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('onboarding.shiftForm.buttons.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t('onboarding.shiftForm.buttons.creating') : t('onboarding.shiftForm.buttons.createShift')}
        </Button>
      </div>
    </form>
  )
}
