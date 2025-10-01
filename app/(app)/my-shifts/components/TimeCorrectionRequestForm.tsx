'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertCircle, Send } from 'lucide-react'

interface TimeCorrectionRequestFormProps {
  eventId?: string
  originalTime?: string
  onSuccess?: () => void
}

export function TimeCorrectionRequestForm({
  eventId,
  originalTime,
  onSuccess
}: TimeCorrectionRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    requested_time: '',
    reason: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.requested_time || !formData.reason) {
      toast.error('Compila tutti i campi')
      return
    }

    if (formData.reason.length < 10) {
      toast.error('La motivazione deve essere di almeno 10 caratteri')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/v1/timeclock/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          original_time: originalTime,
          requested_time: new Date(formData.requested_time).toISOString(),
          reason: formData.reason
        }),
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Errore nella richiesta')
        return
      }

      toast.success('Richiesta di correzione inviata')
      setIsOpen(false)
      setFormData({ requested_time: '', reason: '' })
      onSuccess?.()
    } catch (error) {
      console.error('Correction request error:', error)
      toast.error('Errore durante l\'invio')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          Richiedi Correzione
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Richiedi Correzione Timbratura</DialogTitle>
          <DialogDescription>
            Compila il modulo per richiedere una correzione della timbratura.
            Il tuo manager riceverà la richiesta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {originalTime && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Orario originale:</p>
              <p className="font-mono text-foreground">
                {new Date(originalTime).toLocaleString('it-IT')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="requested_time">Orario Corretto</Label>
            <Input
              id="requested_time"
              type="datetime-local"
              value={formData.requested_time}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requested_time: e.target.value
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivazione (minimo 10 caratteri)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Spiega il motivo della correzione..."
              rows={4}
              required
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.reason.length}/500 caratteri
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                'Invio...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Invia Richiesta
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
