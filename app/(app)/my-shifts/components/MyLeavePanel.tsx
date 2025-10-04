'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import type { LeaveRequest } from '@/types/shifts'
import { toast } from 'sonner'
import { useLeaveTypes } from '../hooks/useLeaveTypes'
import { useTranslation } from '@/lib/i18n'

interface Props {
  leaveRequests: LeaveRequest[]
  onUpdate: () => void
}

export function MyLeavePanel({ leaveRequests, onUpdate }: Props) {
  const { t } = useTranslation()
  const [isAdding, setIsAdding] = useState(false)
  const { leaveTypes, loading: typesLoading } = useLeaveTypes()
  const [newRequest, setNewRequest] = useState({
    start_at: '',
    end_at: '',
    reason: '',
    type_id: ''
  })

  const handleSubmit = async () => {
    if (!newRequest.type_id || !newRequest.start_at || !newRequest.end_at) {
      toast.error(t('myShifts.leave.errorAllFields'))
      return
    }

    try {
      const res = await fetch('/api/v1/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest),
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json()
        if (error.error === 'LEAVE_COLLISION') {
          toast.error(t('myShifts.leave.errorCollision'))
        } else {
          throw new Error(error.message || 'Failed to create request')
        }
        return
      }

      const data = await res.json()
      
      if (data.warning) {
        toast.warning(data.warning, { duration: 5000 })
      } else {
        toast.success(t('myShifts.toast.leaveRequested'))
      }
      
      setIsAdding(false)
      setNewRequest({ start_at: '', end_at: '', reason: '', type_id: '' })
      onUpdate()
    } catch (error) {
      toast.error(t('myShifts.toast.errorLeave'))
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
            <CardTitle className="text-success">{t('myShifts.leave.approved')}</CardTitle>
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
                <Badge variant="default">{t('myShifts.leave.statusApproved')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending requests */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('myShifts.leave.pending')}</CardTitle>
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
                <Badge variant="secondary">{t('myShifts.leave.statusPending')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rejected requests */}
      {rejected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t('myShifts.leave.rejected')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejected.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 border rounded-md bg-destructive/5">
                <div>
                  <p className="font-medium">
                    {format(parseISO(req.start_at), 'd MMM', { locale: it })} - {format(parseISO(req.end_at), 'd MMM yyyy', { locale: it })}
                  </p>
                  {req.notes && <p className="text-sm text-destructive mt-1">{t('myShifts.leave.reason')} {req.notes}</p>}
                </div>
                <Badge variant="destructive">{t('myShifts.leave.statusRejected')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {leaveRequests.length === 0 && !isAdding && (
        <Alert>
          <AlertDescription>
            {t('myShifts.leave.noRequests')}
          </AlertDescription>
        </Alert>
      )}

      {/* New request form */}
      {isAdding ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('myShifts.leave.newRequestTitle')}</CardTitle>
            <CardDescription>
              {t('myShifts.leave.newRequestDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t('myShifts.leave.leaveType')}</Label>
              <Select
                value={newRequest.type_id}
                onValueChange={(value) => setNewRequest(prev => ({ ...prev, type_id: value }))}
                disabled={typesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('myShifts.leave.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('myShifts.leave.startDate')}</Label>
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
                <Label>{t('myShifts.leave.endDate')}</Label>
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
              <Label>{t('myShifts.leave.reasonOptional')}</Label>
              <Textarea 
                value={newRequest.reason}
                onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('myShifts.leave.reasonPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={!newRequest.type_id || !newRequest.start_at || !newRequest.end_at || typesLoading}
              >
                {t('myShifts.leave.submit')}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)} className="flex-1">
                {t('myShifts.leave.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {t('myShifts.leave.add')}
        </Button>
      )}
    </div>
  )
}
