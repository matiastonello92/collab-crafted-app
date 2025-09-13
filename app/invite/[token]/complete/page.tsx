import { Suspense } from 'react'
import { CompleteProfileForm } from './components/CompleteProfileForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, User } from 'lucide-react'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

interface Props {
  params: { token: string }
}

export default async function CompleteProfilePage({ params }: Props) {
  const { token } = params

  // Check if user is authenticated
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // SSR validation - ensure token is still valid and was accepted by current user
  let isValidToken = true
  let errorMessage = ''
  let inviteData: any = null

  try {
    const supabaseAdmin = createSupabaseAdminClient()
    const { data: validationData, error } = await supabaseAdmin
      .rpc('invitation_validate_v2', { p_token: token })

    if (error) {
      console.error('Token validation error:', error)
      isValidToken = false
      errorMessage = 'Errore nella validazione dell\'invito'
    } else if (!validationData || validationData.length === 0) {
      isValidToken = false
      errorMessage = 'Invito non trovato'
    } else {
      inviteData = validationData[0]
      
      // Check if invitation email matches current user
      if (user.email?.toLowerCase() !== inviteData.email?.toLowerCase()) {
        isValidToken = false
        errorMessage = 'L\'invito non corrisponde all\'utente corrente'
      }
    }
  } catch (error) {
    console.error('SSR validation error:', error)
    isValidToken = false
    errorMessage = 'Errore nella validazione dell\'invito'
  }

  // Get current profile if exists
  let currentProfile: any = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    
    currentProfile = profile
  } catch (error) {
    console.error('Error fetching profile:', error)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <User className="h-6 w-6" />
              Completa il tuo Profilo
            </CardTitle>
            <CardDescription>
              Completa le informazioni del tuo profilo per iniziare
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
                <CompleteProfileForm 
                  token={token} 
                  user={user} 
                  initialProfile={currentProfile}
                  inviteData={inviteData}
                />
              </Suspense>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}