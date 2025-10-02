'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'

interface Step2Props {
  locationId: string
  orgId: string
  onRotaCreated: (rotaId: string, weekStart: string) => void
  onBack: () => void
  checkRota: (locationId: string, weekStart: string) => Promise<any>
}

export function Step2SelectWeek({
  locationId,
  orgId,
  onRotaCreated,
  onBack,
  checkRota,
}: Step2Props) {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [existingRota, setExistingRota] = useState<any>(null)
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return
    setSelectedDate(date)

    const monday = startOfWeek(date, { weekStartsOn: 1 })
    const weekStart = format(monday, 'yyyy-MM-dd')

    setChecking(true)
    const result = await checkRota(locationId, weekStart)
    setChecking(false)

    if (result?.exists) {
      setExistingRota(result.rota)
    } else {
      setExistingRota(null)
    }
  }

  const handleCreateRota = async () => {
    if (!selectedDate) return
    
    // Validate location_id only - backend will derive org_id
    if (!locationId || locationId === 'null') {
      toast.error('Location mancante. Ricarica la pagina.')
      console.error('Invalid locationId:', locationId)
      return
    }

    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekStart = format(monday, 'yyyy-MM-dd')
    
    const body = {
      location_id: locationId,
      week_start_date: weekStart,
    }

    setCreating(true)
    try {
      console.log('🔍 [Step2SelectWeek] Creating rota with body:', body)
      const res = await fetch('/api/v1/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      })

      console.log('🔍 [Step2SelectWeek] Rota creation response:', { status: res.status, ok: res.ok })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ [Step2SelectWeek] Failed to create rota:', { status: res.status, error: errorData })
        throw new Error(errorData.error || 'Errore nella creazione della rota')
      }

      const data = await res.json()
      console.log('✅ [Step2SelectWeek] Rota created:', data.rota?.id)
      toast.success('Rota creata con successo')
      onRotaCreated(data.rota.id, weekStart)
    } catch (error: any) {
      console.error('❌ [Step2SelectWeek] Exception:', error)
      toast.error(error.message || 'Errore nella creazione della rota')
    } finally {
      setCreating(false)
    }
  }

  const handleUseExisting = () => {
    if (existingRota) {
      onRotaCreated(existingRota.id, existingRota.week_start_date)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Seleziona Settimana</h2>
        <p className="text-muted-foreground">
          Scegli la settimana di riferimento. La settimana inizia sempre di lunedì.
        </p>
      </div>

      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={it}
          className="rounded-md border pointer-events-auto"
        />
      </div>

      {checking && (
        <Alert>
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>Controllo rota esistente...</AlertDescription>
        </Alert>
      )}

      {selectedDate && existingRota && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esiste già una rota per questa settimana (stato: {existingRota.status}).
            Puoi aprirla o crearne una nuova.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Indietro
        </Button>
        <div className="flex gap-2">
          {existingRota && (
            <Button variant="secondary" onClick={handleUseExisting}>
              Apri Esistente
            </Button>
          )}
          <Button
            onClick={handleCreateRota}
            disabled={!selectedDate || creating || (existingRota && existingRota.status !== 'draft')}
          >
            {creating ? 'Creazione...' : existingRota ? 'Crea Nuova' : 'Crea Rota'}
          </Button>
        </div>
      </div>
    </div>
  )
}
