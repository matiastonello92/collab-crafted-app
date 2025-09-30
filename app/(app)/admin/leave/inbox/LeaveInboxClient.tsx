'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LeaveRequestCard } from './LeaveRequestCard'
import type { LeaveRequest } from '@/types/shifts'
import { AlertCircle } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

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

export function LeaveInboxClient() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  
  const { data, error, mutate } = useSWR<{ requests: LeaveRequestWithDetails[] }>(
    selectedLocation 
      ? `/api/v1/leave/requests/pending?location_id=${selectedLocation}`
      : '/api/v1/leave/requests/pending',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  const handleDecision = async () => {
    await mutate()
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento delle richieste: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const requests = data?.requests || []
  const loading = !data && !error

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Inbox</h1>
        <p className="text-muted-foreground">
          Approva o rifiuta le richieste di permesso/ferie in attesa
        </p>
      </div>

      {/* Filters (optional - location selector can be added here) */}
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Nessuna richiesta in attesa</p>
            <p className="text-sm mt-2">
              Tutte le richieste di permesso sono state gestite
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <LeaveRequestCard 
              key={request.id} 
              request={request}
              onDecision={handleDecision}
            />
          ))}
        </div>
      )}
    </div>
  )
}
