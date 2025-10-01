'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { ViolationWithUser } from '@/types/compliance'

interface CompliancePanelProps {
  userId: string
  locationId?: string
}

export function CompliancePanel({ userId, locationId }: CompliancePanelProps) {
  const supabase = useSupabase()
  const [violations, setViolations] = useState<ViolationWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [silenceDialog, setSilenceDialog] = useState<{ open: boolean; violationId?: string }>({ open: false })
  const [silenceReason, setSilenceReason] = useState('')

  useEffect(() => {
    fetchViolations()
  }, [userId, locationId])

  async function fetchViolations() {
    try {
      setLoading(true)
      let query = supabase
        .from('compliance_violations')
        .select(`
          *,
          rule:rule_id (
            id,
            rule_key,
            display_name,
            description,
            threshold_value
          )
        `)
        .eq('user_id', userId)
        .order('violation_date', { ascending: false })

      if (locationId) {
        query = query.eq('location_id', locationId)
      }

      const { data, error } = await query

      if (error) throw error
      setViolations(data || [])
    } catch (err: any) {
      console.error('Error fetching violations:', err)
      toast.error('Errore caricamento violazioni')
    } finally {
      setLoading(false)
    }
  }

  async function handleSilence() {
    if (!silenceDialog.violationId || !silenceReason.trim()) {
      toast.error('Motivazione obbligatoria')
      return
    }

    try {
      const res = await fetch(`/api/v1/compliance/violations/${silenceDialog.violationId}/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: silenceReason })
      })

      if (!res.ok) throw new Error('Failed to silence violation')

      toast.success('Violazione silenziata')
      setSilenceDialog({ open: false })
      setSilenceReason('')
      fetchViolations()
    } catch (err: any) {
      console.error('Error silencing violation:', err)
      toast.error('Errore silenziamento')
    }
  }

  const activeViolations = violations.filter(v => !v.is_silenced)
  const silencedViolations = violations.filter(v => v.is_silenced)

  if (loading) {
    return <div className="text-sm text-muted-foreground">Caricamento...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Violazioni Attive ({activeViolations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeViolations.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-success" />
              Nessuna violazione attiva
            </div>
          ) : (
            <div className="space-y-3">
              {activeViolations.map(v => (
                <div key={v.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={v.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {v.severity === 'critical' ? 'CRITICO' : 'WARNING'}
                      </Badge>
                      <span className="font-medium">{v.rule?.display_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Data: {new Date(v.violation_date).toLocaleDateString('it-IT')}
                    </div>
                    <div className="text-sm">
                      {v.details.rest_hours !== undefined && (
                        <span>Riposo: {v.details.rest_hours}h (min {v.details.threshold}h)</span>
                      )}
                      {v.details.hours_worked !== undefined && (
                        <span>Ore: {v.details.hours_worked}h (max {v.details.threshold}h)</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSilenceDialog({ open: true, violationId: v.id })}
                  >
                    Silenzia
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {silencedViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              Violazioni Silenziate ({silencedViolations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {silencedViolations.map(v => (
                <div key={v.id} className="p-3 border rounded-lg opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{v.rule?.display_name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(v.violation_date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {v.silence_reason && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Motivo: {v.silence_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={silenceDialog.open} onOpenChange={(open) => setSilenceDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Silenzia Violazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Questa azione silenzierà la violazione e richiede una motivazione per audit.
            </p>
            <Textarea
              placeholder="Inserisci motivazione (min 10 caratteri)..."
              value={silenceReason}
              onChange={(e) => setSilenceReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSilenceDialog({ open: false })}>
              Annulla
            </Button>
            <Button onClick={handleSilence} disabled={silenceReason.length < 10}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
