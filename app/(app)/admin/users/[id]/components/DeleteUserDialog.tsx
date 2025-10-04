'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
  userName: string
}

export function DeleteUserDialog({ userId, userEmail, userName }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleDelete = async () => {
    if (confirmEmail !== userEmail) {
      toast.error('Email di conferma non corretta')
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirmEmail }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Errore nella eliminazione')
        }

        toast.success('Utente eliminato con successo')
        setIsOpen(false)
        router.push('/admin/users')
        router.refresh()
      } catch (error: any) {
        console.error('Error deleting user:', error)
        toast.error(error.message || 'Errore nella eliminazione dell\'utente')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Elimina Utente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Elimina Utente
          </DialogTitle>
          <DialogDescription>
            Questa azione è <strong>irreversibile</strong>. L'utente e tutti i suoi dati 
            associati verranno eliminati permanentemente dal sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Verranno eliminati:</p>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  <li>Account utente</li>
                  <li>Ruoli e permessi</li>
                  <li>Job tags assegnati</li>
                  <li>Sessioni attive</li>
                  <li>Cronologia attività</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Per confermare, digita l'email dell'utente:
            </Label>
            <div className="p-2 bg-muted rounded text-sm font-mono">
              {userEmail}
            </div>
            <Input
              placeholder="Inserisci email per confermare"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isPending || confirmEmail !== userEmail}
          >
            {isPending ? 'Eliminazione...' : 'Elimina Definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}