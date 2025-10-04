'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Check, X, Calendar, User, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { LeaveRequest } from '@/types/shifts'
import { useTranslation } from '@/lib/i18n'

interface LeaveRequestWithDetails extends LeaveRequest {
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
  }
}

interface Props {
  request: LeaveRequestWithDetails
  onDecision: () => void
}

export function LeaveRequestCard({ request, onDecision }: Props) {
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const { t } = useTranslation()

  const handleDecision = async (decision: 'approve' | 'reject') => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/v1/leave/requests/${request.id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes || undefined }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to process request')
      }

      toast.success(
        decision === 'approve' 
          ? t('toast.leave.approved')
          : t('toast.leave.rejected')
      )
      onDecision()
    } catch (error: any) {
      console.error('Error processing leave request:', error)
      toast.error(t('toast.leave.errorProcessing'))
    } finally {
      setProcessing(false)
    }
  }

  const startDate = format(new Date(request.start_at), 'dd MMM yyyy', { locale: it })
  const endDate = format(new Date(request.end_at), 'dd MMM yyyy', { locale: it })
  const createdDate = format(new Date(request.created_at), 'dd MMM yyyy', { locale: it })

  const userName = request.profiles.full_name || t('admin.leaveInboxUserUnknown')
  const leaveType = request.leave_types.label
  const leaveColor = request.leave_types.color || '#6b7280'

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header: User + Leave Type */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={request.profiles.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{userName}</p>
              <p className="text-sm text-muted-foreground">
                {t('admin.leaveInboxRequested')} {createdDate}
              </p>
            </div>
          </div>
          <Badge style={{ backgroundColor: leaveColor }}>
            {leaveType}
          </Badge>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{startDate}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">{endDate}</span>
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="flex gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-muted-foreground">{request.reason}</p>
          </div>
        )}

        {/* Notes Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('admin.leaveInboxNotes')}</label>
          <Textarea
            placeholder={t('admin.leaveInboxNotesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => handleDecision('approve')}
            disabled={processing}
            className="flex-1"
            variant="default"
          >
            <Check className="h-4 w-4 mr-2" />
            {t('admin.leaveInboxApprove')}
          </Button>
          <Button
            onClick={() => handleDecision('reject')}
            disabled={processing}
            className="flex-1"
            variant="destructive"
          >
            <X className="h-4 w-4 mr-2" />
            {t('admin.leaveInboxReject')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
