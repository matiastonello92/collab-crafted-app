'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus, Eye, EyeOff, CheckCircle, XCircle, Clock, Shield, LogIn, LogOut, User } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { withRetry } from '@/lib/utils/retry'
import { getEmailRedirectTo } from '@/lib/url'

const passwordSchema = z.object({
  password: z.string().min(6, 'Password deve essere di almeno 6 caratteri'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
})

type PasswordForm = z.infer<typeof passwordSchema>

interface InvitationData {
  email: string
  role_name: string
  location_ids: string[]
  overrides: Array<{
    location_id: string
    permission_name: string
    granted: boolean
  }>
  expires_at: string
  is_valid: boolean
}

interface Props {
  token: string
}

type UiState =
  | { status: 'idle' }
  | { status: 'pending-email-confirm'; note: string }
  | { status: 'error'; note: string }

export function InviteAcceptance({ token }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'validate' | 'signup' | 'login' | 'success'>('validate')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [emailMismatch, setEmailMismatch] = useState(false)
  const [uiState, setUiState] = useState<UiState>({ status: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  // Validate invitation token
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data, error } = await supabase
          .rpc('invitation_validate_v2', { p_token: token })

        if (error) throw error

        if (!data || data.length === 0) {
          setError('Invito non trovato o non valido')
          return
        }

        const inviteData = data[0]
        
        if (!inviteData.is_valid) {
          if (new Date() > new Date(inviteData.expires_at)) {
            setError('Questo invito è scaduto')
          } else {
            setError('Questo invito non è più valido (potrebbe essere già stato utilizzato o revocato)')
          }
          return
        }

        setInvitationData(inviteData)
        
        // Check if user is already logged in
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          setCurrentUser(userData.user)
          if (userData.user.email?.toLowerCase() === inviteData.email.toLowerCase()) {
            // Correct user, can accept directly
            setStep('login')
          } else {
            // Wrong user, show mismatch
            setEmailMismatch(true)
            setStep('login')
          }
        } else {
          // Not logged in, show signup flow
          setStep('signup')
        }
      } catch (error: any) {
        console.error('Error validating invitation:', error)
        setError('Errore nella validazione dell\'invito')
      } finally {
        setIsLoading(false)
      }
    }

    validateInvitation()
  }, [token])

  const handleSignup = async (data: PasswordForm) => {
    if (!invitationData) return

    setIsSubmitting(true)
    setUiState({ status: 'idle' })

    try {
      const supabase = createSupabaseBrowserClient()
      console.log('Attempting signup for:', invitationData.email)
      
      // Step 1: Sign up the user
      const { data: su, error: se } = await supabase.auth.signUp({
        email: invitationData.email,
        password: data.password,
        options: {
          emailRedirectTo: getEmailRedirectTo()
        }
      })

      if (se) {
        console.error('Signup error:', se)
        if (se.message?.includes('User already registered')) {
          setStep('login')
          toast.info('Utente già registrato. Effettua il login per accettare l\'invito.')
          setIsSubmitting(false)
          return
        }
        setUiState({ status: 'error', note: se.message })
        setIsSubmitting(false)
        return
      }

      // Step 2: If no session, try server-first approach
      if (!su.session) {
        console.log('No session from signup, using server-first approach')
        
        // Try server route for user creation
        const response = await fetch('/api/public/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            email: invitationData.email,
            password: data.password
          })
        })
        
        if (!response.ok) {
          toast.error('Errore creazione account (server)')
          setIsSubmitting(false)
          return
        }

        // Step 3: Try to sign in
        const { data: si, error: le } = await supabase.auth.signInWithPassword({
          email: invitationData.email,
          password: data.password
        })
        
        if (le || !si?.session) {
          const note = `Ti abbiamo inviato un'email di conferma a ${invitationData.email}. ` +
            `Apri il link per completare l'attivazione, poi torna qui e premi "Accedi ora".`
          setUiState({ status: 'pending-email-confirm', note })
          toast.info('Email di conferma inviata. Controlla la casella di posta.')
          setIsSubmitting(false)
          return
        }
      }

      // Step 4: Accept invitation with retry
      await withRetry(async () => {
        const { data: result, error: ae } = await supabase.rpc('invitation_accept_v2', { p_token: token })
        if (ae) throw ae
        if (!result?.ok) {
          const errorMsg = result?.code === 'INVITE_NO_ROLES' 
            ? 'L\'invito non ha ruoli/sedi associati. Contatta l\'amministratore.'
            : result?.code || 'Errore sconosciuto'
          throw new Error(errorMsg)
        }
        return true
      })

      setStep('success')
      toast.success('Account creato e invito accettato!')
      
      // Redirect to profile completion
      setTimeout(() => {
        router.push(`/invite/${token}/complete`)
      }, 800)
    } catch (error: any) {
      console.error('Error during signup:', error)
      setUiState({ status: 'error', note: error.message || 'Errore durante la registrazione' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginAfterConfirm = async () => {
    if (!invitationData) return

    setIsSubmitting(true)
    try {
      const supabase = createSupabaseBrowserClient()
      // Get password from the current form
      const passwordElement = document.getElementById('password') as HTMLInputElement
      const password = passwordElement?.value || ''
      
      if (!password) {
        toast.error('Inserisci la password per continuare')
        return
      }
      
      const { data: si, error: le } = await supabase.auth.signInWithPassword({
        email: invitationData.email,
        password: password
      })
      
      if (le || !si?.session) {
        toast.error('Accesso non riuscito. Verifica di aver cliccato il link nella mail.')
        return
      }
      
      const { data: result, error: ae } = await supabase.rpc('invitation_accept_v2', { p_token: token })
      if (ae) {
        toast.error(ae.message)
        return
      }
      if (!result?.ok) {
        const errorMsg = result?.code === 'INVITE_NO_ROLES' 
          ? 'L\'invito non ha ruoli/sedi associati. Contatta l\'amministratore.'
          : result?.code || 'Errore sconosciuto'
        toast.error(errorMsg)
        return
      }
      
      toast.success('Invito accettato! Benvenuto 👋')
      router.push(`/invite/${token}/complete`)
    } catch (error: any) {
      console.error('Error in handleLoginAfterConfirm:', error)
      toast.error('Errore durante l\'accesso')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogin = async (data: { email: string; password: string }) => {
    if (!invitationData) return

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        console.log('Attempting login for:', data.email)
        
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        })

        if (loginError) {
          console.error('Login error:', loginError)
          throw loginError
        }

        if (loginData.session) {
          console.log('Login successful, accepting invitation')
          // Accept the invitation with retry
          await withRetry(async () => {
            const { data: result, error: acceptError } = await supabase
              .rpc('invitation_accept_v2', { p_token: token })
            if (acceptError) throw acceptError
            if (!result?.ok) {
              const errorMsg = result?.code === 'INVITE_NO_ROLES' 
                ? 'L\'invito non ha ruoli/sedi associati. Contatta l\'amministratore.'
                : result?.code || 'Errore sconosciuto'
              throw new Error(errorMsg)
            }
            return true
          })

          setStep('success')
          toast.success('Invito accettato!')
          
          // Redirect to profile completion
          setTimeout(() => {
            router.push(`/invite/${token}/complete`)
          }, 800)
        }
      } catch (error: any) {
        console.error('Error during login:', error)
        toast.error(error.message || 'Errore durante il login')
      }
    })
  }

  const handleDirectAccept = async () => {
    if (!invitationData || !currentUser) return

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        console.log('Accepting invitation directly')
        
        await withRetry(async () => {
          const { data: result, error: acceptError } = await supabase
            .rpc('invitation_accept_v2', { p_token: token })
          if (acceptError) throw acceptError
          if (!result?.ok) {
            const errorMsg = result?.code === 'INVITE_NO_ROLES' 
              ? 'L\'invito non ha ruoli/sedi associati. Contatta l\'amministratore.'
              : result?.code || 'Errore sconosciuto'
            throw new Error(errorMsg)
          }
          return true
        })

        setStep('success')
        toast.success('Invito accettato!')
        
        // Redirect to profile completion
        setTimeout(() => {
          router.push(`/invite/${token}/complete`)
        }, 800)
      } catch (error: any) {
        console.error('Error accepting invitation:', error)
        toast.error(error.message || 'Errore nell\'accettazione dell\'invito')
      }
    })
  }

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      setCurrentUser(null)
      setEmailMismatch(false)
      setStep('signup')
      toast.info('Logout effettuato')
    } catch (error: any) {
      console.error('Error during logout:', error)
      toast.error('Errore durante il logout')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!invitationData) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>Dati invito non disponibili</AlertDescription>
      </Alert>
    )
  }

  // Success step
  if (step === 'success') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-green-800">Invito Accettato!</h3>
            <p className="text-muted-foreground">
              Completamento profilo in corso...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <User className="h-6 w-6" />
          Invito al Sistema
        </CardTitle>
        <CardDescription>
          Benvenuto, {invitationData.email}!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Invitation Details */}
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="text-sm">
                {invitationData.role_name}
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Scade {formatDistanceToNow(new Date(invitationData.expires_at), {
                  addSuffix: true,
                  locale: it
                })}
              </span>
            </div>
          </div>

          {/* Locations */}
          {invitationData.location_ids && invitationData.location_ids.length > 0 && (
            <div className="space-y-1 text-center">
              <p className="text-xs font-medium text-muted-foreground">Locations:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {invitationData.location_ids.map((locationId, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    Loc {idx + 1}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Permission Overrides */}
          {invitationData.overrides && invitationData.overrides.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Permessi personalizzati
              </p>
              <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                {invitationData.overrides.map((override, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="font-mono text-xs">{override.permission_name}</span>
                    <Badge variant={override.granted ? "default" : "destructive"} className="text-xs h-4">
                      {override.granted ? "✓" : "✗"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Mismatch Warning */}
        {emailMismatch && currentUser && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Sei loggato come <strong>{currentUser.email}</strong> ma l'invito è per <strong>{invitationData.email}</strong>.
              Effettua il logout per accettare l'invito con l'account corretto.
            </AlertDescription>
          </Alert>
        )}

        {/* Email Confirmation Banner */}
        {uiState.status === 'pending-email-confirm' && (
          <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            <p className="mb-2">{uiState.note}</p>
            <Button
              type="button"
              onClick={handleLoginAfterConfirm}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              className="bg-yellow-100 border-yellow-300 text-yellow-900 hover:bg-yellow-200"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Accesso...' : 'Accedi ora'}
            </Button>
          </div>
        )}

        {/* Error Banner */}
        {uiState.status === 'error' && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {uiState.note}
          </div>
        )}

        {/* Step Forms */}
        {step === 'signup' && (
          <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-3">
              <div className="text-center">
                <h4 className="font-medium">Crea Account</h4>
                <p className="text-sm text-muted-foreground">Passaggio 1 di 2</p>
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm">Email</Label>
                <Input 
                  value={invitationData.email} 
                  disabled 
                  className="bg-muted text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caratteri"
                    className="text-sm pr-10"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-sm">Conferma Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ripeti password"
                  className="text-sm"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isPending || isSubmitting} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {(isPending || isSubmitting) ? 'Creazione...' : 'Crea Account'}
            </Button>
          </form>
        )}

        {step === 'login' && !emailMismatch && currentUser && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium">Accetta Invito</h4>
              <p className="text-sm text-muted-foreground">Passaggio finale</p>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Sei loggato come <strong>{currentUser.email}</strong>. 
                Clicca per accettare l'invito.
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleDirectAccept} disabled={isPending} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              {isPending ? 'Accettazione...' : 'Accetta Invito'}
            </Button>
          </div>
        )}

        {step === 'login' && emailMismatch && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium">Login Richiesto</h4>
              <p className="text-sm text-muted-foreground">Accedi con l'account dell'invito</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleLogout} variant="outline" className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            <LoginForm 
              invitationData={invitationData}
              onSubmit={handleLogin}
              isPending={isPending}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Separate login form component
function LoginForm({ 
  invitationData, 
  onSubmit, 
  isPending 
}: { 
  invitationData: InvitationData; 
  onSubmit: (data: { email: string; password: string }) => void;
  isPending: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false)
  
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password richiesta'),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: invitationData.email,
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm">Email</Label>
        <Input 
          {...register('email')}
          disabled
          className="bg-muted text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="loginPassword" className="text-sm">Password</Label>
        <div className="relative">
          <Input
            id="loginPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Inserisci password"
            className="text-sm pr-10"
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        <LogIn className="h-4 w-4 mr-2" />
        {isPending ? 'Login...' : 'Accedi e Accetta'}
      </Button>
    </form>
  )
}