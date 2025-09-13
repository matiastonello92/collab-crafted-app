'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Phone, Globe, ArrowRight, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nome completo è richiesto').max(100, 'Nome troppo lungo'),
  phone: z.string().optional().or(z.literal('')),
  locale: z.string().min(1),
  timezone: z.string().min(1),
})

type ProfileForm = z.infer<typeof profileSchema>

interface Props {
  token: string
  user: any
  initialProfile: any
  inviteData: any
}

export function CompleteProfileForm({ token, user, initialProfile, inviteData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState(initialProfile?.locale || 'it')
  const [selectedTimezone, setSelectedTimezone] = useState(initialProfile?.timezone || 'Europe/Rome')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initialProfile?.full_name || '',
      phone: initialProfile?.phone || '',
      locale: initialProfile?.locale || 'it',
      timezone: initialProfile?.timezone || 'Europe/Rome',
    }
  })

  const onSubmit = async (data: ProfileForm) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)

    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Update or create profile using the RPC function
        const { error } = await supabase.rpc('profile_update_self', {
          p_full_name: data.full_name,
          p_phone: data.phone || null,
          p_locale: selectedLocale,
          p_timezone: selectedTimezone,
          p_marketing_opt_in: false, // Default value
          p_notif_prefs: {
            email_notifications: true,
            system_notifications: true,
            activity_notifications: false
          }
        })
        
        if (error) {
          throw error
        }

        // Show success message
        toast.success('Profilo completato con successo!')
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/')
        }, 1000)
        
      } catch (error: any) {
        console.error('Error updating profile:', error)
        toast.error(`Errore nell'aggiornamento del profilo: ${error.message}`)
        setIsSubmitting(false)
      }
    })
  }

  const handleSkip = () => {
    // Allow users to skip profile completion and go directly to dashboard
    toast.info('Puoi completare il profilo più tardi dalle impostazioni')
    router.push('/')
  }

  return (
    <div className="space-y-6">
      {/* Welcome message with invite details */}
      <div className="text-center space-y-4 p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Benvenuto, {user.email}!</h3>
          <p className="text-sm text-muted-foreground">
            Hai accettato l'invito con successo. Completa il tuo profilo per iniziare.
          </p>
        </div>
        
        {inviteData?.role_name && (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">
              Ruolo: {inviteData.role_name}
            </Badge>
          </div>
        )}
      </div>

      {/* Profile completion form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" role="form" aria-label="Completa profilo">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Nome completo *
          </Label>
          <Input
            id="full_name"
            type="text"
            placeholder="Mario Rossi"
            disabled={isPending || isSubmitting}
            aria-describedby={errors.full_name ? 'full_name-error' : undefined}
            aria-invalid={!!errors.full_name}
            {...register('full_name')}
          />
          {errors.full_name && (
            <p id="full_name-error" role="alert" className="text-sm text-destructive">
              {errors.full_name.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Telefono (opzionale)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+39 123 456 7890"
            disabled={isPending || isSubmitting}
            {...register('phone')}
          />
        </div>

        {/* Locale */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Lingua preferita
          </Label>
          <Select
            value={selectedLocale}
            onValueChange={setSelectedLocale}
            disabled={isPending || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fuso orario</Label>
          <Select
            value={selectedTimezone}
            onValueChange={setSelectedTimezone}
            disabled={isPending || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Rome">Europa/Roma (GMT+1)</SelectItem>
              <SelectItem value="Europe/Paris">Europa/Parigi (GMT+1)</SelectItem>
              <SelectItem value="Europe/London">Europa/Londra (GMT+0)</SelectItem>
              <SelectItem value="Europe/Berlin">Europa/Berlino (GMT+1)</SelectItem>
              <SelectItem value="America/New_York">America/New York (GMT-5)</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los Angeles (GMT-8)</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={isPending || isSubmitting}
            className="flex-1"
            aria-busy={isPending || isSubmitting}
          >
            {isPending || isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Completa profilo
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isPending || isSubmitting}
            className="sm:w-auto"
          >
            Salta per ora
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Help text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Potrai modificare queste informazioni in qualsiasi momento dalle impostazioni del profilo.</p>
        </div>
      </form>
    </div>
  )
}