'use client'

import { useState } from 'react'
import { ArrowLeft, User, Settings, Bell, Save, Mail, Loader2 } from 'lucide-react'
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
import { AvatarUploader } from '@/components/AvatarUploader'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useTranslation } from '@/lib/i18n'

interface UserSettingsClientProps {
  user: any
  profile: any
  userId: string
  orgId: string | null
  avatarUrl: string | null
  canBranding: boolean
}

export function UserSettingsClient({ user, profile: initialProfile, userId, orgId, avatarUrl, canBranding }: UserSettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile || {})
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [lastEmailTest, setLastEmailTest] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()


  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save email preferences separately
      if (profile.email_preferences) {
        const { error: emailPrefError } = await supabase
          .from('profiles')
          .update({ email_preferences: profile.email_preferences })
          .eq('id', userId);
        
        if (emailPrefError) throw emailPrefError;
      }

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
      
      toast.success(t('settings.profileUpdated'))
    } catch (error: any) {
      toast.error(`${t('settings.saveError')}: ${error.message}`)
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

  const updateEmailPref = (key: string, value: boolean) => {
    const newEmailPrefs = { 
      ...profile.email_preferences, 
      [key]: value 
    }
    updateProfile('email_preferences', newEmailPrefs)
  }

  const handleTestEmail = async () => {
    setIsTestingEmail(true)
    try {
      const response = await fetch('/api/settings/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email')
      }
      
      toast.success(t('settings.testEmailSent'))
      setLastEmailTest(new Date().toLocaleString('it-IT'))
    } catch (error: any) {
      toast.error(`${t('settings.testEmailError')}: ${error.message}`)
    } finally {
      setIsTestingEmail(false)
    }
  }

  // Show organization join CTA if no orgId
  if (!orgId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {t('settings.backToDashboard')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">{t('settings.completeSetup')}</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.setupOrg')}</CardTitle>
            <CardDescription>
              {t('settings.setupOrgDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin">{t('settings.goToAdmin')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {t('settings.backToDashboard')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-muted-foreground">
              {t('settings.manageProfile')}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? t('settings.saving') : t('settings.saveChanges')}
        </Button>
      </div>

      {/* Settings Tabs */}
      <div className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('settings.profile')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('settings.preferences')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('settings.notifications')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profileInfo')}</CardTitle>
                <CardDescription>
                  {t('settings.updatePersonalInfo')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section - only if branding feature enabled */}
                {canBranding && orgId && (
                  <AvatarUploader
                    orgId={orgId}
                    userId={userId}
                    currentUrl={avatarUrl || undefined}
                    onAvatarUpdate={(url) => setProfile((prev: any) => ({ ...prev, avatar_url: url }))}
                  />
                )}

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">{t('settings.fullName')}</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name || ''}
                      onChange={(e) => updateProfile('full_name', e.target.value)}
                      placeholder={t('settings.fullNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ''}
                      onChange={(e) => updateProfile('phone', e.target.value)}
                      placeholder={t('settings.phonePlaceholder')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('settings.emailCannotChange')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.preferences')}</CardTitle>
                <CardDescription>
                  {t('settings.customizeExperience')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="locale">{t('settings.language')}</Label>
                  <Select
                    value={profile.locale || locale}
                    onValueChange={(value) => {
                      updateProfile('locale', value);
                      setLocale(value as 'it' | 'en');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">{t('languages.it')}</SelectItem>
                      <SelectItem value="en">{t('languages.en')}</SelectItem>
                      <SelectItem value="fr">{t('languages.fr')}</SelectItem>
                      <SelectItem value="es">{t('languages.es')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                  <Select
                    value={profile.timezone || 'Europe/Rome'}
                    onValueChange={(value) => updateProfile('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Rome">{t('timezones.Europe/Rome')}</SelectItem>
                      <SelectItem value="Europe/Paris">{t('timezones.Europe/Paris')}</SelectItem>
                      <SelectItem value="Europe/London">{t('timezones.Europe/London')}</SelectItem>
                      <SelectItem value="America/New_York">{t('timezones.America/New_York')}</SelectItem>
                      <SelectItem value="America/Los_Angeles">{t('timezones.America/Los_Angeles')}</SelectItem>
                      <SelectItem value="Asia/Tokyo">{t('timezones.Asia/Tokyo')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.marketing')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.marketingDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={profile.marketing_opt_in || false}
                    onCheckedChange={(checked) => updateProfile('marketing_opt_in', checked)}
                  />
                </div>

                {/* Email Test Section */}
                <div className="pt-4 border-t">
                  <div className="space-y-4">
                    <div>
                      <Label>{t('settings.testEmailConfig')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.testEmailDescription')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                        variant="outline"
                        size="sm"
                      >
                        {isTestingEmail ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        {isTestingEmail ? t('settings.sending') : t('settings.sendTestEmail')}
                      </Button>
                      {lastEmailTest && (
                        <p className="text-sm text-muted-foreground">
                          {t('settings.lastTest')}: {lastEmailTest}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notificationPreferences')}</CardTitle>
                <CardDescription>
                  {t('settings.controlNotifications')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.emailNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.receiveEmailNotif')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.email_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('email_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.systemNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.systemNotifDescription')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.system_notifications || true}
                      onCheckedChange={(checked) => updateNotificationPref('system_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.activityNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.activityNotifDescription')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.activity_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('activity_notifications', checked)}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold mb-4">{t('settings.detailedEmailPreferences')}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('settings.chooseEmailTypes')}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('settings.rotaPublished')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.rotaPublishedDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={profile.email_preferences?.rota_published !== false}
                        onCheckedChange={(checked) => updateEmailPref('rota_published', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('settings.shiftChanges')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.shiftChangesDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={profile.email_preferences?.shift_assignment_change !== false}
                        onCheckedChange={(checked) => updateEmailPref('shift_assignment_change', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('settings.leaveDecisions')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.leaveDecisionsDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={profile.email_preferences?.leave_decision !== false}
                        onCheckedChange={(checked) => updateEmailPref('leave_decision', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notif_json">{t('settings.advancedConfig')}</Label>
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