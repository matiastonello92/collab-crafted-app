'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Shift {
  id: string
  start_at: string
  assigned_user_id?: string
}

interface Step4Props {
  rotaId: string
  shifts: Shift[]
  onBack: () => void
}

export function Step4Review({ rotaId, shifts, onBack }: Step4Props) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)

  const assignedShifts = shifts.filter((s) => s.assigned_user_id)
  const unassignedShifts = shifts.filter((s) => !s.assigned_user_id)
  const uniqueUsers = new Set(assignedShifts.map((s) => s.assigned_user_id)).size

  const handlePublish = async () => {
    if (unassignedShifts.length > 0) {
      if (
        !confirm(
          `Ci sono ${unassignedShifts.length} turni non assegnati. Vuoi procedere comunque con la pubblicazione?`
        )
      ) {
        return
      }
    }

    setPublishing(true)
    try {
      const res = await fetch(`/api/v1/rotas/${rotaId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella pubblicazione')
      }

      toast.success('Rota pubblicata con successo! Email inviate agli utenti assegnati.')
      
      // Redirect to planner
      setTimeout(() => {
        router.push('/planner')
      }, 2000)
    } catch (error: any) {
      console.error('Error publishing rota:', error)
      toast.error(error.message || 'Errore nella pubblicazione')
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Riepilogo & Pubblicazione</h2>
        <p className="text-muted-foreground">
          Controlla il riepilogo e pubblica la rota per inviare le email agli utenti.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{shifts.length}</p>
              <p className="text-sm text-muted-foreground">Turni Totali</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{uniqueUsers}</p>
              <p className="text-sm text-muted-foreground">Utenti Coinvolti</p>
            </div>
          </div>
        </Card>
      </div>

      {assignedShifts.length > 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            {assignedShifts.length} turni assegnati e pronti per la pubblicazione.
          </AlertDescription>
        </Alert>
      )}

      {unassignedShifts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {unassignedShifts.length} turni non ancora assegnati. Puoi comunque
            pubblicare e assegnare in seguito.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <h3 className="font-medium mb-3">Cosa succede dopo la pubblicazione?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <span>
              La rota passa allo stato "pubblicata" e non sarà più modificabile
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <span>
              Ogni utente assegnato riceverà un'email con i dettagli dei suoi turni
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <span>
              Gli utenti potranno visualizzare i loro turni nella sezione "I Miei Turni"
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <span>
              Potrai monitorare la rota dal Planner e dalla dashboard
            </span>
          </li>
        </ul>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={publishing}>
          Indietro
        </Button>
        <Button onClick={handlePublish} disabled={publishing || shifts.length === 0}>
          {publishing ? 'Pubblicazione in corso...' : 'Pubblica Rota'}
        </Button>
      </div>
    </div>
  )
}
