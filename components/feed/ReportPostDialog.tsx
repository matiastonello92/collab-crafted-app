'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { usePostReports } from '@/hooks/usePostReports'

interface ReportPostDialogProps {
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam o contenuto indesiderato' },
  { value: 'harassment', label: 'Molestie o bullismo' },
  { value: 'inappropriate', label: 'Contenuto inappropriato' },
  { value: 'misinformation', label: 'Disinformazione' },
  { value: 'violence', label: 'Violenza o contenuti pericolosi' },
  { value: 'hate', label: 'Incitamento all\'odio' },
  { value: 'other', label: 'Altro' },
]

export function ReportPostDialog({ postId, open, onOpenChange }: ReportPostDialogProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { reportPost } = usePostReports()

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Seleziona un motivo')
      return
    }

    setIsSubmitting(true)

    try {
      await reportPost(postId, reason, details)
      toast.success('Post segnalato con successo')
      onOpenChange(false)
      setReason('')
      setDetails('')
    } catch (error: any) {
      toast.error(error.message || 'Errore durante la segnalazione')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Segnala Post</DialogTitle>
          <DialogDescription>
            Aiutaci a mantenere la community sicura segnalando contenuti inappropriati.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Seleziona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Dettagli aggiuntivi (opzionale)</Label>
            <Textarea
              id="details"
              placeholder="Fornisci maggiori dettagli sulla segnalazione..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Invio...' : 'Invia Segnalazione'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
