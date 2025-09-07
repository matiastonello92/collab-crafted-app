'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, User, Settings, Bell, Upload, Save } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

interface UserSettingsClientProps {
  user: any
  profile: any
}

export function UserSettingsClient({ user, profile: initialProfile }: UserSettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile || {})
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)
      
      setProfile((prev: any) => ({ ...prev, avatar_url: urlData.publicUrl }))
      toast.success('Avatar caricato con successo!')
    } catch (error: any) {
      toast.error(`Errore nel caricamento: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.rpc('profile_update_self', {
        p_full_name: profile.full_name || null,
        p_avatar_url: profile.avatar_url || null,
        p_phone: profile.phone || null,
        p_locale: profile.locale || null,
        p_timezone: profile.timezone || null,
        p_marketing_opt_in: profile.marketing_opt_in || false,
        p_notif_prefs: profile.notif_prefs || {}
      })
      
      if (error) throw error
      
      toast.success('Profilo aggiornato con successo!')
    } catch (error: any) {
      toast.error(`Errore nel salvataggio: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProfile = (field: string, value: any) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  const updateNotificationPref = (key: string, value: boolean) => {
    const newNotifPrefs = { ...profile.notif_prefs, [key]: value }
    updateProfile('notif_prefs', newNotifPrefs)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Torna alla Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Impostazioni</h1>
            <p className="text-muted-foreground">
              Gestisci il tuo profilo e le tue preferenze
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
        </Button>
      </div>

      {/* Settings Tabs */}
      <div className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profilo
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferenze
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Profilo</CardTitle>
                <CardDescription>
                  Aggiorna le tue informazioni personali
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="text-lg">
                      {profile.full_name 
                        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                        : user.email?.[0]?.toUpperCase() || 'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Foto profilo</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Caricamento...' : 'Cambia foto'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Formati: JPG, PNG, GIF. Max 5MB.
                    </p>
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name || ''}
                      onChange={(e) => updateProfile('full_name', e.target.value)}
                      placeholder="Mario Rossi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefono</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ''}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      placeholder="+39 123 456 7890"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      L&apos;email non può essere modificata da qui
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferenze</CardTitle>
                <CardDescription>
                  Personalizza la tua esperienza nell&apos;app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="locale">Lingua</Label>
                  <Select
                    value={profile.locale || 'it'}
                    onValueChange={(value) => updateProfile('locale', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Fuso orario</Label>
                  <Select
                    value={profile.timezone || 'Europe/Rome'}
                    onValueChange={(value) => updateProfile('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Rome">Europa/Roma</SelectItem>
                      <SelectItem value="Europe/Paris">Europa/Parigi</SelectItem>
                      <SelectItem value="Europe/London">Europa/Londra</SelectItem>
                      <SelectItem value="America/New_York">America/New York</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Ricevi email promozionali e aggiornamenti
                    </p>
                  </div>
                  <Switch
                    checked={profile.marketing_opt_in || false}
                    onCheckedChange={(checked) => updateProfile('marketing_opt_in', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferenze Notifiche</CardTitle>
                <CardDescription>
                  Controlla quando e come ricevere le notifiche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email notifiche</Label>
                      <p className="text-sm text-muted-foreground">
                        Ricevi notifiche via email
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.email_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('email_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifiche sistema</Label>
                      <p className="text-sm text-muted-foreground">
                        Aggiornamenti importanti del sistema
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.system_notifications || true}
                      onCheckedChange={(checked) => updateNotificationPref('system_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifiche attività</Label>
                      <p className="text-sm text-muted-foreground">
                        Modifiche e aggiornamenti sui tuoi dati
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.activity_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('activity_notifications', checked)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notif_json">Configurazione avanzata (JSON)</Label>
                  <Textarea
                    id="notif_json"
                    value={JSON.stringify(profile.notif_prefs || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        updateProfile('notif_prefs', parsed)
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="{}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato JSON per configurazioni avanzate
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}