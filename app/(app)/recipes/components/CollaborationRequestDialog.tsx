'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface CollaborationRequestDialogProps {
  recipeId: string
  recipeTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CollaborationRequestDialog({
  recipeId,
  recipeTitle,
  isOpen,
  onClose,
  onSuccess
}: CollaborationRequestDialogProps) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Inserisci un messaggio per la tua richiesta')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/request-collaboration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la richiesta')
      }

      toast.success('Richiesta di collaborazione inviata!')
      setMessage('')
      onClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('Collaboration request error:', error)
      toast.error(error.message || 'Errore durante la richiesta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Richiedi Collaborazione</DialogTitle>
          <DialogDescription>
            Vuoi contribuire alla ricetta &quot;{recipeTitle}&quot;? Spiega perché vorresti collaborare.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Es: Ho esperienza con questo piatto e vorrei aggiungere alcuni consigli utili..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            disabled={loading}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Invia Richiesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
