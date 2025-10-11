import { Suspense } from 'react'
import { InviteAcceptance } from './components/InviteAcceptance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle } from 'lucide-react'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/i18n/server'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InviteTokenPage({ params }: Props) {
  const { token } = await params
  const t = await getTranslation();

  // SSR validation
  let isValidToken = true
  let errorMessage = ''

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: validationData, error } = await supabaseAdmin
      .rpc('invitation_validate_v2', { p_token: token })

    if (error || !validationData || validationData.length === 0) {
      isValidToken = false
      errorMessage = t('invite.notFound')
    } else {
      const inviteData = validationData[0]
      if (!inviteData.is_valid) {
        isValidToken = false
        if (new Date() > new Date(inviteData.expires_at)) {
          errorMessage = t('invite.expired')
        } else {
          errorMessage = t('invite.invalid')
        }
      }
    }
  } catch (error) {
    console.error('SSR validation error:', error)
    isValidToken = false
    errorMessage = t('invite.validationError')
  }

  return (
    <div className="min-h-[100svh] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('invite.pageTitle')}</CardTitle>
            <CardDescription>
              {t('invite.pageDescription')}
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