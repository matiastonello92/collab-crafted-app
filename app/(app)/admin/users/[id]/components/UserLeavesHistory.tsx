'use client'

import { useState } from 'react'
import { useUserLeaveRequests } from '@/hooks/useUserLeaveRequests'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Calendar, CheckCircle, XCircle, Clock, User, AlertCircle } from 'lucide-react'
import { LeaveDecisionDialog } from './LeaveDecisionDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'

interface UserLeavesHistoryProps {
  userId: string
}

export function UserLeavesHistory({ userId }: UserLeavesHistoryProps) {
  const { t } = useTranslation()
  const { requests: allRequests, loading, error, mutate } = useUserLeaveRequests(userId)
  const { permissions } = usePermissions()
  const canManageLeaves = checkPermission(permissions, ['leave:manage', 'shifts:approve'])

  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const pendingRequests = allRequests.filter(r => r.status === 'pending')
  const approvedRequests = allRequests.filter(r => r.status === 'approved')
  const rejectedRequests = allRequests.filter(r => r.status === 'rejected')

  const handleDecision = (request: any, decisionType: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setDecision(decisionType)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    mutate()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {t('common.error')}
          </CardTitle>
          <CardDescription>
            {t('contracts.leaves.messages.fetchError')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => mutate()} variant="outline">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Stats
  const approvedThisYear = approvedRequests.filter(r => {
    const year = new Date(r.created_at).getFullYear()
    return year === new Date().getFullYear()
  }).length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('contracts.leaves.stats.pending')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('contracts.leaves.stats.approvedYTD')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedThisYear}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('contracts.leaves.stats.daysUsed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('common.comingSoon')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && canManageLeaves && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              {t('contracts.leaves.pending.title')}
            </CardTitle>
            <CardDescription>
              {pendingRequests.length} {pendingRequests.length === 1 ? 'richiesta' : 'richieste'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => {
              const startDate = format(new Date(request.start_at), 'd MMM yyyy', { locale: it })
              const endDate = format(new Date(request.end_at), 'd MMM yyyy', { locale: it })

              return (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{startDate} - {endDate}</span>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: request.leave_types.color || '#6b7280'
                          }}
                        >
                          {request.leave_types.label}
                        </Badge>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-muted-foreground">
                          {request.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleDecision(request, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('contracts.leaves.actions.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDecision(request, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('contracts.leaves.actions.reject')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* History Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contracts.leaves.history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                {t('contracts.leaves.history.tabAll')} ({allRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                {t('contracts.leaves.history.tabApproved')} ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                {t('contracts.leaves.history.tabRejected')} ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {allRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('contracts.leaves.history.noHistory')}
                </p>
              ) : (
                allRequests.map((request) => (
                  <LeaveRequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3 mt-4">
              {approvedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('contracts.leaves.history.noHistory')}
                </p>
              ) : (
                approvedRequests.map((request) => (
                  <LeaveRequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3 mt-4">
              {rejectedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('contracts.leaves.history.noHistory')}
                </p>
              ) : (
                rejectedRequests.map((request) => (
                  <LeaveRequestCard key={request.id} request={request} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LeaveDecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leaveRequest={selectedRequest}
        decision={decision}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

function LeaveRequestCard({ request }: { request: any }) {
  const { t } = useTranslation()
  const startDate = format(new Date(request.start_at), 'd MMM yyyy', { locale: it })
  const endDate = format(new Date(request.end_at), 'd MMM yyyy', { locale: it })

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{startDate} - {endDate}</span>
            </div>
            <Badge
              style={{
                backgroundColor: request.leave_types.color || '#6b7280'
              }}
            >
              {request.leave_types.label}
            </Badge>
            <Badge variant="outline" className={statusColors[request.status as keyof typeof statusColors]}>
              {request.status === 'pending' && t('common.pending')}
              {request.status === 'approved' && t('common.approved')}
              {request.status === 'rejected' && t('common.rejected')}
              {request.status === 'cancelled' && t('common.cancelled')}
            </Badge>
          </div>

          {request.reason && (
            <p className="text-sm text-muted-foreground">
              <strong>{t('contracts.leaves.fields.reason')}:</strong> {request.reason}
            </p>
          )}

          {request.notes && (
            <p className="text-sm text-muted-foreground">
              <strong>{t('contracts.leaves.fields.managerNotes')}:</strong> {request.notes}
            </p>
          )}

          {request.approved_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>
                {t('contracts.leaves.fields.approvedBy')}: {
                  request.profiles?.full_name || t('contracts.leaves.unknownApprover')
                }
              </span>
              <span>•</span>
              <span>
                {format(new Date(request.approved_at), 'd MMM yyyy', { locale: it })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
