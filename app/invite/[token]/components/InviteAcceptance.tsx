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
import { toast } from 'sonner'
import { UserPlus, Eye, EyeOff, CheckCircle, XCircle, Clock, Shield } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

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

export function InviteAcceptance({ token }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'validate' | 'signup' | 'login'>('validate')
  const [existingUser, setExistingUser] = useState(false)

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
        
        // Check if user already exists
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user?.email === inviteData.email) {
          setExistingUser(true)
          setStep('login')
        } else {
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

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        // Sign up the user
        const { error: signupError } = await supabase.auth.signUp({
          email: invitationData.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        })

        if (signupError) throw signupError

        // Accept the invitation
        const { data: acceptResult, error: acceptError } = await supabase
          .rpc('invitation_accept_v2', { p_token: token })

        if (acceptError) throw acceptError

        toast.success('Account creato e invito accettato con successo!')
        
        // Redirect to dashboard
        router.push('/')
      } catch (error: any) {
        console.error('Error during signup/acceptance:', error)
        
        if (error.message?.includes('User already registered')) {
          setExistingUser(true)
          setStep('login')
          toast.info('Utente già registrato. Effettua il login per accettare l\'invito.')
        } else {
          toast.error(error.message || 'Errore durante la registrazione')
        }
      }
    })
  }

  const handleLogin = async () => {
    if (!invitationData) return

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        // Accept the invitation (user should already be logged in)
        const { data: acceptResult, error: acceptError } = await supabase
          .rpc('invitation_accept_v2', { p_token: token })

        if (acceptError) throw acceptError

        toast.success('Invito accettato con successo!')
        
        // Redirect to dashboard
        router.push('/')
      } catch (error: any) {
        console.error('Error accepting invitation:', error)
        toast.error(error.message || 'Errore nell\'accettazione dell\'invito')
      }
    })
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

  return (
    <div className="space-y-6">
      {/* Invitation Details */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">
            Benvenuto, {invitationData.email}!
          </h3>
          <p className="text-muted-foreground">
            Sei stato invitato con il ruolo di <strong>{invitationData.role_name}</strong>
          </p>
        </div>

        {/* Expiry Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Scade {formatDistanceToNow(new Date(invitationData.expires_at), {
              addSuffix: true,
              locale: it
            })}
          </span>
        </div>

        {/* Locations */}
        {invitationData.location_ids && invitationData.location_ids.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Locations assegnate:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {/* We'd need to fetch location names, for now show IDs */}
              {invitationData.location_ids.map((locationId, idx) => (
                <Badge key={idx} variant="secondary">
                  Location {idx + 1}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Permission Overrides */}
        {invitationData.overrides && invitationData.overrides.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permessi personalizzati:
            </p>
            <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
              {invitationData.overrides.map((override, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="font-mono">{override.permission_name}</span>
                  <Badge variant={override.granted ? "default" : "destructive"} className="text-xs">
                    {override.granted ? "Concesso" : "Negato"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Forms */}
      {step === 'signup' && (
        <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
          <div className="space-y-4">
            <h4 className="text-lg font-medium">Crea il tuo Account</h4>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={invitationData.email} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Inserisci la tua password"
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Conferma la tua password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            {isPending ? 'Creazione in corso...' : 'Crea Account e Accetta Invito'}
          </Button>
        </form>
      )}

      {step === 'login' && (
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Sei già registrato con questa email. Clicca per accettare l'invito.
            </AlertDescription>
          </Alert>
          
          <Button onClick={handleLogin} disabled={isPending} className="w-full">
            <CheckCircle className="h-4 w-4 mr-2" />
            {isPending ? 'Accettazione in corso...' : 'Accetta Invito'}
          </Button>
        </div>
      )}
    </div>
  )
}