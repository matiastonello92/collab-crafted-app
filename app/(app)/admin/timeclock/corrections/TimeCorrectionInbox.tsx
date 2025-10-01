'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, User, Calendar } from 'lucide-react'
import type { TimeCorrectionRequest } from '@/types/timeclock'

interface CorrectionWithDetails extends TimeCorrectionRequest {
  requester?: { full_name: string; avatar_url?: string | null }
  event?: { kind: string; occurred_at: string } | null
  location?: { name: string }
}

export function TimeCorrectionInbox() {
  const [corrections, setCorrections] = useState<CorrectionWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadCorrections()
  }, [])

  const loadCorrections = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/timeclock/corrections/pending')
      if (!res.ok) throw new Error('Failed to load corrections')

      const data = await res.json()
      setCorrections(data.corrections || [])
    } catch (error) {
      console.error('Error loading corrections:', error)
      toast.error('Errore nel caricamento delle richieste')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecision = async (
    correctionId: string,
    decision: 'approve' | 'reject'
  ) => {
    setProcessingId(correctionId)

    try {
      const res = await fetch(`/api/v1/timeclock/corrections/${correctionId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          notes: reviewNotes[correctionId] || undefined
        })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Errore nella decisione')
        return
      }

      toast.success(
        decision === 'approve'
          ? 'Correzione approvata'
          : 'Correzione rifiutata'
      )

      // Reload corrections
      loadCorrections()
    } catch (error) {
      console.error('Decision error:', error)
      toast.error('Errore durante la decisione')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const eventKindLabels = {
    clock_in: 'Ingresso',
    clock_out: 'Uscita',
    break_start: 'Inizio Pausa',
    break_end: 'Fine Pausa'
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Clock className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Caricamento richieste...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Correzioni Timbrature</h1>
          <p className="text-muted-foreground">Richieste di correzione in attesa</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {corrections.length} {corrections.length === 1 ? 'richiesta' : 'richieste'}
        </Badge>
      </div>

      {corrections.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Nessuna richiesta in sospeso
          </h3>
          <p className="text-muted-foreground">
            Tutte le richieste di correzione sono state processate
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {corrections.map((correction) => (
            <Card key={correction.id} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {correction.requester?.full_name || 'Utente'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {correction.location?.name || 'Location'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(correction.created_at).toLocaleDateString('it-IT')}
                  </Badge>
                </div>

                {/* Correction Details */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  {correction.event && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tipo timbratura:</span>
                      <Badge variant="secondary">
                        {eventKindLabels[correction.event.kind as keyof typeof eventKindLabels]}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orario originale:</span>
                    <span className="font-mono text-foreground">
                      {correction.original_time
                        ? formatDateTime(correction.original_time)
                        : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Orario richiesto:</span>
                    <span className="font-mono font-semibold text-primary">
                      {formatDateTime(correction.requested_time)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">Motivazione:</p>
                    <p className="text-foreground">{correction.reason}</p>
                  </div>
                </div>

                {/* Review Notes */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Note revisione (opzionale)
                  </label>
                  <Textarea
                    value={reviewNotes[correction.id] || ''}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [correction.id]: e.target.value
                      }))
                    }
                    placeholder="Aggiungi note per il dipendente..."
                    className="resize-none"
                    rows={2}
                    disabled={processingId === correction.id}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleDecision(correction.id, 'approve')}
                    disabled={processingId === correction.id}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Approva
                  </Button>
                  <Button
                    onClick={() => handleDecision(correction.id, 'reject')}
                    disabled={processingId === correction.id}
                    variant="destructive"
                    className="flex-1"
                    size="lg"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Rifiuta
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
