'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface CollaborationRequest {
  id: string
  requester_id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  requested_at: string
  reviewed_at?: string
  requester?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  reviewer?: {
    id: string
    full_name: string
  }
}

interface CollaborationRequestsListProps {
  recipeId: string
  canManage: boolean
}

export function CollaborationRequestsList({ recipeId, canManage }: CollaborationRequestsListProps) {
  const [requests, setRequests] = useState<CollaborationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [recipeId])

  const loadRequests = async () => {
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/collaboration-requests`)
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch(
        `/api/v1/recipes/${recipeId}/collaboration-requests/${requestId}/approve`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Errore durante l\'approvazione')

      toast.success('Richiesta approvata!')
      loadRequests()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'approvazione')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const response = await fetch(
        `/api/v1/recipes/${recipeId}/collaboration-requests/${requestId}/reject`,
        { method: 'POST' }
      )

      if (!response.ok) throw new Error('Errore durante il rifiuto')

      toast.success('Richiesta rifiutata')
      loadRequests()
    } catch (error: any) {
      toast.error(error.message || 'Errore durante il rifiuto')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Richieste di Collaborazione</CardTitle>
          <CardDescription>Nessuna richiesta al momento</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Richieste di Collaborazione</CardTitle>
        <CardDescription>{requests.length} richiesta/e totali</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-start gap-4 p-4 border rounded-lg bg-card"
          >
            <Avatar>
              <AvatarImage src={request.requester?.avatar_url} />
              <AvatarFallback>
                {request.requester?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{request.requester?.full_name || 'Utente'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(request.requested_at), {
                      addSuffix: true,
                      locale: it
                    })}
                  </p>
                </div>
                {request.status === 'pending' && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    In attesa
                  </Badge>
                )}
                {request.status === 'approved' && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approvata
                  </Badge>
                )}
                {request.status === 'rejected' && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rifiutata
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{request.message}</p>

              {canManage && request.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approva
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Rifiuta
                  </Button>
                </div>
              )}

              {request.status !== 'pending' && request.reviewed_at && (
                <p className="text-xs text-muted-foreground pt-2">
                  Revisione da {request.reviewer?.full_name || 'Admin'} •{' '}
                  {formatDistanceToNow(new Date(request.reviewed_at), {
                    addSuffix: true,
                    locale: it
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
