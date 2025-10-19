'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertCircle } from 'lucide-react'

interface LeaveRequest {
  id: string
  start_at: string
  end_at: string
  reason?: string
  notes?: string
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
  }
}

interface LeaveDecisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaveRequest: LeaveRequest | null
  decision: 'approve' | 'reject'
  onSuccess: () => void
}

export function LeaveDecisionDialog({
  open,
  onOpenChange,
  leaveRequest,
  decision,
  onSuccess
}: LeaveDecisionDialogProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!leaveRequest) return
    
    // Validate notes for rejection
    if (decision === 'reject' && !notes.trim()) {
      toast.error(t('contracts.leaves.dialog.rejectNotesRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/leave/requests/${leaveRequest.id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes.trim() || undefined })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process decision')
      }

      toast.success(
        decision === 'approve' 
          ? t('contracts.leaves.messages.approveSuccess')
          : t('contracts.leaves.messages.rejectSuccess')
      )
      
      onSuccess()
      onOpenChange(false)
      setNotes('')
    } catch (error) {
      console.error('Error processing leave decision:', error)
      toast.error(
        decision === 'approve'
          ? t('contracts.leaves.messages.approveError')
          : t('contracts.leaves.messages.rejectError')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!leaveRequest) return null

  const startDate = format(new Date(leaveRequest.start_at), 'd MMM yyyy', { locale: it })
  const endDate = format(new Date(leaveRequest.end_at), 'd MMM yyyy', { locale: it })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === 'approve' 
              ? t('contracts.leaves.dialog.approveTitle')
              : t('contracts.leaves.dialog.rejectTitle')}
          </DialogTitle>
          <DialogDescription>
            {decision === 'approve'
              ? t('contracts.leaves.dialog.approveConfirm')
              : t('contracts.leaves.dialog.rejectConfirm')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{startDate} - {endDate}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                style={{ 
                  backgroundColor: leaveRequest.leave_types.color || '#6b7280'
                }}
              >
                {leaveRequest.leave_types.label}
              </Badge>
            </div>

            {leaveRequest.reason && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('contracts.leaves.fields.reason')}
                </Label>
                <p className="text-sm mt-1">{leaveRequest.reason}</p>
              </div>
            )}
          </div>

          {/* Manager Notes */}
          <div className="space-y-2">
            <Label htmlFor="manager-notes">
              {t('contracts.leaves.fields.managerNotes')}
              {decision === 'reject' && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Textarea
              id="manager-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('contracts.leaves.dialog.notesPlaceholder')}
              rows={4}
            />
            {decision === 'reject' && !notes.trim() && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{t('contracts.leaves.dialog.rejectNotesRequired')}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant={decision === 'approve' ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={isSubmitting || (decision === 'reject' && !notes.trim())}
          >
            {isSubmitting
              ? t('common.saving')
              : decision === 'approve'
              ? t('contracts.leaves.actions.approve')
              : t('contracts.leaves.actions.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
