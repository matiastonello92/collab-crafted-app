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
import { useTranslation } from '@/lib/i18n'

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
      toast.error(t('admin.userManagement.deleteDialog.emailMismatch'))
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
          throw new Error(result.error || t('admin.userManagement.deleteDialog.error'))
        }

        toast.success(t('admin.userManagement.deleteDialog.success'))
        setIsOpen(false)
        router.push('/admin/users')
        router.refresh()
      } catch (error: any) {
        console.error('Error deleting user:', error)
        toast.error(error.message || t('admin.userManagement.deleteDialog.error'))
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          {t('admin.userManagement.deleteDialog.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('admin.userManagement.deleteDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.userManagement.deleteDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{t('admin.userManagement.deleteDialog.willBeDeleted')}</p>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  <li>{t('admin.userManagement.deleteDialog.account')}</li>
                  <li>{t('admin.userManagement.deleteDialog.rolesAndPermissions')}</li>
                  <li>{t('admin.userManagement.deleteDialog.jobTags')}</li>
                  <li>{t('admin.userManagement.deleteDialog.activeSessions')}</li>
                  <li>{t('admin.userManagement.deleteDialog.activityHistory')}</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('admin.userManagement.deleteDialog.confirmLabel')}
            </Label>
            <div className="p-2 bg-muted rounded text-sm font-mono">
              {userEmail}
            </div>
            <Input
              placeholder={t('admin.userManagement.deleteDialog.emailPlaceholder')}
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
            {t('admin.userManagement.deleteDialog.cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isPending || confirmEmail !== userEmail}
          >
            {isPending ? t('admin.userManagement.deleteDialog.deleting') : t('admin.userManagement.deleteDialog.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}