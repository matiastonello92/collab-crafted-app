'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { LeaveRequest } from '@/types/shifts'
import { toast } from 'sonner'

interface Props {
  leaveRequests: LeaveRequest[]
  onUpdate: () => void
}

export function MyLeavePanel({ leaveRequests, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [newRequest, setNewRequest] = useState({
    start_at: '',
    end_at: '',
    reason: '',
    type_id: '' // TODO: fetch leave types
  })

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/v1/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
      })

      if (!res.ok) throw new Error(await res.text())

      toast.success('Richiesta permesso inviata')
      setIsAdding(false)
      setNewRequest({ start_at: '', end_at: '', reason: '', type_id: '' })
      onUpdate()
    } catch (error) {
      toast.error('Errore nell\'invio della richiesta')
      console.error(error)
    }
  }

  const approved = leaveRequests.filter(r => r.status === 'approved')
  const pending = leaveRequests.filter(r => r.status === 'pending')
  const rejected = leaveRequests.filter(r => r.status === 'rejected')

  return (
    <div className="space-y-6">
      {/* Approved leaves */}
      {approved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-success">Permessi Approvati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approved.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-md bg-success/5">
                <div>
                  <p className="font-medium">
                    {format(parseISO(req.start_at), 'd MMM', { locale: it })} - {format(parseISO(req.end_at), 'd MMM yyyy', { locale: it })}
                  </p>
                  {req.reason && <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>}
                </div>
                <Badge variant="default">Approvato</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Richieste in Attesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">
                    {format(parseISO(req.start_at), 'd MMM', { locale: it })} - {format(parseISO(req.end_at), 'd MMM yyyy', { locale: it })}
                  </p>
                  {req.reason && <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>}
                </div>
                <Badge variant="secondary">In attesa</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejected requests */}
      {rejected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Richieste Rifiutate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejected.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-md bg-destructive/5">
                <div>
                  <p className="font-medium">
                    {format(parseISO(req.start_at), 'd MMM', { locale: it })} - {format(parseISO(req.end_at), 'd MMM yyyy', { locale: it })}
                  </p>
                  {req.notes && <p className="text-sm text-destructive mt-1">Motivo: {req.notes}</p>}
                </div>
                <Badge variant="destructive">Rifiutato</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {leaveRequests.length === 0 && !isAdding && (
        <Alert>
          <AlertDescription>
            Nessuna richiesta di permesso. Puoi crearne una nuova cliccando il pulsante sotto.
          </AlertDescription>
        </Alert>
      )}

      {/* New request form */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuova Richiesta Permesso</CardTitle>
            <CardDescription>
              Compila i dettagli della tua richiesta di permesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data inizio</Label>
                <input 
                  type="date" 
                  value={newRequest.start_at.split('T')[0] || ''}
                  onChange={(e) => setNewRequest(prev => ({ 
                    ...prev, 
                    start_at: e.target.value ? `${e.target.value}T00:00:00+01:00` : '' 
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label>Data fine</Label>
                <input 
                  type="date" 
                  value={newRequest.end_at.split('T')[0] || ''}
                  onChange={(e) => setNewRequest(prev => ({ 
                    ...prev, 
                    end_at: e.target.value ? `${e.target.value}T23:59:59+01:00` : '' 
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <Label>Motivazione (opzionale)</Label>
              <Textarea 
                value={newRequest.reason}
                onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Descrivi brevemente il motivo della richiesta..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={!newRequest.start_at || !newRequest.end_at}
              >
                Invia Richiesta
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)} className="flex-1">
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Richiesta Permesso
        </Button>
      )}
    </div>
  )
}
