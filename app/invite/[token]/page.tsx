import { Suspense } from 'react'
import { InviteAcceptance } from './components/InviteAcceptance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  params: { token: string }
}

export default async function InviteTokenPage({ params }: Props) {
  const { token } = params

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invito al Sistema</CardTitle>
            <CardDescription>
              Sei stato invitato a partecipare al sistema di gestione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <InviteAcceptance token={token} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}