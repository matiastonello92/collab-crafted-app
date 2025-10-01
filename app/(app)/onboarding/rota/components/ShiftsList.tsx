'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserSelector } from '@/components/onboarding/UserSelector'
import { Pencil, Trash2, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'

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
  assigned_user_id?: string
}

interface ShiftsListProps {
  shifts: Shift[]
  jobTags: JobTag[]
  users: User[]
  onEdit: (shift: Shift) => void
  onDelete: (shiftId: string) => void
  onAssignmentChange: () => void
}

export function ShiftsList({
  shifts,
  jobTags,
  users,
  onEdit,
  onDelete,
  onAssignmentChange,
}: ShiftsListProps) {
  const [assigningShift, setAssigningShift] = useState<string | null>(null)

  const handleAssign = async (shiftId: string, userId: string) => {
    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          status: 'assigned',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nell\'assegnazione')
      }

      toast.success('Utente assegnato con successo')
      setAssigningShift(null)
      onAssignmentChange()
    } catch (error: any) {
      console.error('Error assigning shift:', error)
      toast.error(error.message || 'Errore nell\'assegnazione')
    }
  }

  const getJobTagLabel = (jobTagId?: string) => {
    if (!jobTagId) return 'Nessun ruolo'
    const tag = jobTags.find((t) => t.id === jobTagId)
    return tag?.label_it || 'Sconosciuto'
  }

  const getJobTagColor = (jobTagId?: string) => {
    if (!jobTagId) return undefined
    const tag = jobTags.find((t) => t.id === jobTagId)
    return tag?.color
  }

  const getUserName = (userId?: string) => {
    if (!userId) return 'Non assegnato'
    const user = users.find((u) => u.id === userId)
    return user?.full_name || user?.email || 'Sconosciuto'
  }

  if (shifts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Nessun turno creato. Usa il form sopra per aggiungere turni.
        </p>
      </Card>
    )
  }

  const sortedShifts = [...shifts].sort((a, b) =>
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  return (
    <div className="space-y-2">
      {sortedShifts.map((shift) => (
        <Card key={shift.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  style={{
                    borderColor: getJobTagColor(shift.job_tag_id) || 'hsl(var(--border))',
                    color: getJobTagColor(shift.job_tag_id) || 'hsl(var(--foreground))',
                  }}
                >
                  {getJobTagLabel(shift.job_tag_id)}
                </Badge>
                <span className="text-sm font-medium">
                  {format(parseISO(shift.start_at), 'EEEE d MMM', { locale: it })}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {format(parseISO(shift.start_at), 'HH:mm')} -{' '}
                  {format(parseISO(shift.end_at), 'HH:mm')}
                </span>
                {shift.break_minutes > 0 && (
                  <span>Pausa: {shift.break_minutes} min</span>
                )}
              </div>

              {shift.notes && (
                <p className="text-sm text-muted-foreground">{shift.notes}</p>
              )}

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {assigningShift === shift.id ? (
                  <div className="flex-1 max-w-xs">
                    <UserSelector
                      users={users}
                      value={shift.assigned_user_id}
                      onValueChange={(userId) => handleAssign(shift.id, userId)}
                      placeholder="Seleziona utente"
                    />
                  </div>
                ) : (
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => setAssigningShift(shift.id)}
                  >
                    {getUserName(shift.assigned_user_id)}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(shift)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(shift.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
