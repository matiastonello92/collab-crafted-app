'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, FileText, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useUserLeaveRequests } from '../hooks/useUserLeaveRequests'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface UserLeavesListProps {
  userId: string
}

export function UserLeavesList({ userId }: UserLeavesListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { leaveRequests, loading, error } = useUserLeaveRequests(userId, statusFilter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approvato</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rifiutato</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Attesa</Badge>
      case 'cancelled':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Annullato</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Errore caricamento permessi: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Caricamento...' : `${leaveRequests.length} permessi trovati`}
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="pending">In Attesa</SelectItem>
            <SelectItem value="approved">Approvati</SelectItem>
            <SelectItem value="rejected">Rifiutati</SelectItem>
            <SelectItem value="cancelled">Annullati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
      ) : leaveRequests.length === 0 ? (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            {statusFilter === 'all' 
              ? 'Nessun permesso richiesto' 
              : `Nessun permesso con stato: ${statusFilter}`
            }
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {leaveRequests.map((request) => (
            <Card 
              key={request.id} 
              className="border-l-4" 
              style={{ borderLeftColor: request.leave_types?.color || '#ccc' }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-semibold">
                        {request.leave_types?.label || 'N/A'}
                      </Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(request.start_at), 'dd MMM yyyy', { locale: it })}
                        {' → '}
                        {format(new Date(request.end_at), 'dd MMM yyyy', { locale: it })}
                      </div>
                    </div>

                    {request.reason && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Motivo:</strong> {request.reason}
                      </p>
                    )}

                    {request.approver && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        Approvato da: {request.approver.full_name}
                      </div>
                    )}

                    {request.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        <strong>Note:</strong> {request.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: it })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
