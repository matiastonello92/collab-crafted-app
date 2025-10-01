'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ShiftForm } from './ShiftForm'
import { ShiftsList } from './ShiftsList'
import { toast } from 'sonner'

interface JobTag {
  id: string
  label_it: string
  key: string
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

interface Step3Props {
  rotaId: string
  weekStart: string
  jobTags: JobTag[]
  users: User[]
  shifts: Shift[]
  onShiftsUpdate: () => void
  onBack: () => void
  onNext: () => void
}

export function Step3AddShifts({
  rotaId,
  weekStart,
  jobTags,
  users,
  shifts,
  onShiftsUpdate,
  onBack,
  onNext,
}: Step3Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  const handleShiftCreated = () => {
    setShowForm(false)
    setEditingShift(null)
    onShiftsUpdate()
  }

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift)
    setShowForm(true)
  }

  const handleDelete = async (shiftId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo turno?')) return

    try {
      const res = await fetch(`/api/v1/shifts/${shiftId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Errore nell\'eliminazione del turno')

      toast.success('Turno eliminato')
      onShiftsUpdate()
    } catch (error: any) {
      console.error('Error deleting shift:', error)
      toast.error(error.message || 'Errore nell\'eliminazione del turno')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Aggiungi Turni</h2>
        <p className="text-muted-foreground">
          Crea i turni della settimana e assegna gli utenti registrati.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Turni della Settimana</h3>
          <Button
            onClick={() => {
              setEditingShift(null)
              setShowForm(!showForm)
            }}
            variant={showForm ? 'outline' : 'default'}
          >
            {showForm ? 'Chiudi Form' : 'Nuovo Turno'}
          </Button>
        </div>

        {showForm && (
          <ShiftForm
            rotaId={rotaId}
            weekStart={weekStart}
            jobTags={jobTags}
            users={users}
            editingShift={editingShift}
            onSuccess={handleShiftCreated}
            onCancel={() => {
              setShowForm(false)
              setEditingShift(null)
            }}
          />
        )}
      </Card>

      <ShiftsList
        shifts={shifts}
        jobTags={jobTags}
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAssignmentChange={onShiftsUpdate}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Indietro
        </Button>
        <Button onClick={onNext} disabled={shifts.length === 0}>
          Avanti
        </Button>
      </div>
    </div>
  )
}
