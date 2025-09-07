import { Suspense } from 'react'
import { InviteAcceptance } from './components/InviteAcceptance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle } from 'lucide-react'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

interface Props {
  params: { token: string }
}

export default async function InviteTokenPage({ params }: Props) {
  const { token } = params

  // SSR validation
  let isValidToken = true
  let errorMessage = ''

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: validationData, error } = await supabaseAdmin
      .rpc('invitation_validate_v2', { p_token: token })

    if (error || !validationData || validationData.length === 0) {
      isValidToken = false
      errorMessage = 'Invito non trovato o non valido'
    } else {
      const inviteData = validationData[0]
      if (!inviteData.is_valid) {
        isValidToken = false
        if (new Date() > new Date(inviteData.expires_at)) {
          errorMessage = 'Questo invito è scaduto'
        } else {
          errorMessage = 'Questo invito non è più valido (potrebbe essere già stato utilizzato o revocato)'
        }
      }
    }
  } catch (error) {
    console.error('SSR validation error:', error)
    isValidToken = false
    errorMessage = 'Errore nella validazione dell\'invito'
  }

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
            {!isValidToken ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : (
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <InviteAcceptance token={token} />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}