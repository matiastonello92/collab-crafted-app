'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Settings, Bell, Save, Mail, Loader2, Shield, MapPin, Building, Calendar } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ClientOnly from '@/components/ClientOnly'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { AvatarUploader } from '@/components/AvatarUploader'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useTranslation } from '@/lib/i18n'
import { UserContractsView } from './UserContractsView'
import { PhoneInput, isValidPhoneNumber } from '@/components/ui/phone-input'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface UserRole {
  role_name: string
  role_display_name: string
  location_name?: string
  location_id?: string
  assigned_at: string
}

interface UserSettingsClientProps {
  user: any
  profile: any
  userId: string
  orgId: string | null
  avatarUrl: string | null
  roles: UserRole[]
  locations: Array<{ id: string; name: string }>
}

export function UserProfileClient({ user, profile: initialProfile, userId, orgId, avatarUrl, roles, locations }: UserSettingsClientProps) {
  const [profile, setProfile] = useState(initialProfile || {})
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [lastEmailTest, setLastEmailTest] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState<string>(user.email || '')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [emailPendingVerification, setEmailPendingVerification] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const supabase = createSupabaseBrowserClient()
  const { locale, setLocale } = useLocale()
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  
  // Setup keyboard for Capacitor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/capacitor/native').then(({ setupKeyboard }) => {
        setupKeyboard()
      })
    }
  }, [])


  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = async () => {
    if (newEmail === user.email) {
      toast.error(t('profile.emailUnchanged'))
      return false
    }
    
    if (!isValidEmail(newEmail)) {
      toast.error(t('profile.emailInvalid'))
      return false
    }

    setIsChangingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      })
      
      if (error) throw error
      
      setEmailPendingVerification(newEmail)
      toast.success(`${t('profile.emailVerificationSent')} ${newEmail}`)
      return true
    } catch (error: any) {
      console.error('Email change error:', error)
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast.error(t('profile.emailAlreadyExists'))
      } else {
        toast.error(t('profile.emailChangeError'))
      }
      return false
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handleSave = async () => {
    // Validate phone number if provided
    if (profile.phone && !isValidPhoneNumber(profile.phone)) {
      toast.error(t('profile.phoneInvalidError'))
      return
    }
    
    setIsSaving(true)
    try {
      // Handle email change separately
      if (newEmail !== user.email) {
        const emailChanged = await handleEmailChange()
        if (!emailChanged) {
          setIsSaving(false)
          return
        }
      }

      // Save email preferences separately
      if (profile.email_preferences) {
        const { error: emailPrefError } = await supabase
          .from('profiles')
          .update({ email_preferences: profile.email_preferences })
          .eq('id', userId);
        
        if (emailPrefError) throw emailPrefError;
      }

      const { error } = await supabase.rpc('profile_update_self', {
        p_first_name: profile.first_name || null,
        p_last_name: profile.last_name || null,
        p_avatar_url: profile.avatar_url || null,
        p_phone: profile.phone || null,
        p_locale: profile.locale || null,
        p_timezone: profile.timezone || null,
        p_marketing_opt_in: profile.marketing_opt_in || false,
        p_notif_prefs: profile.notif_prefs || {}
      })
      
      if (error) throw error
      
      toast.success(t('profile.profileUpdated'))
    } catch (error: any) {
      toast.error(`${t('profile.saveError')}: ${error.message}`)
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
      
      toast.success(t('profile.testEmailSent'))
      setLastEmailTest(new Date().toLocaleString('it-IT'))
    } catch (error: any) {
      toast.error(`${t('profile.testEmailError')}: ${error.message}`)
    } finally {
      setIsTestingEmail(false)
    }
  }

  // Handle email verification redirect
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('email-confirmed') === 'true') {
        toast.success(t('profile.emailChangedSuccess'))
        window.history.replaceState({}, '', '/profile')
      }
    }
  })

  // Show organization join CTA if no orgId
  if (!orgId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {t('profile.backToDashboard')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
            <p className="text-muted-foreground">{t('profile.completeSetup')}</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.setupOrg')}</CardTitle>
            <CardDescription>
              {t('profile.setupOrgDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin">{t('profile.goToAdmin')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`container mx-auto py-4 sm:py-6 px-4 space-y-4 sm:space-y-6 ${isMobile ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''}`}>
      {/* Header with Avatar - Mobile Responsive */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button 
            variant="outline" 
            size={isMobile ? "default" : "sm"}
            className={isMobile ? "min-h-[44px]" : ""}
            asChild
          >
            <Link href="/">
              <ArrowLeft className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              {!isMobile && t('profile.backToDashboard')}
            </Link>
          </Button>
          
          {orgId && (
            <AvatarUploader
              orgId={orgId}
              userId={userId}
              currentUrl={avatarUrl || undefined}
              userName={profile.first_name || 'User'}
              onAvatarUpdate={(url) => setProfile((prev: any) => ({ ...prev, avatar_url: url }))}
              mode="header"
            />
          )}
          
          {!isMobile && (
            <div>
              <h1 className="text-3xl font-bold">
                {t('profile.greeting').replace('{name}', profile.first_name || 'Utente')}
              </h1>
              <p className="text-muted-foreground">
                {t('profile.welcomeMessage')}
              </p>
            </div>
          )}
        </div>
        
        {/* Save button: sticky bottom su mobile, top-right su desktop */}
        {isMobile ? (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 safe-area-bottom">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full min-h-[48px]"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSaving ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
          </div>
        )}
      </div>

      {/* Settings Tabs */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            // Mobile: Select dropdown
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full min-h-[44px] mb-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('profile.profile')}
                  </div>
                </SelectItem>
                <SelectItem value="preferences">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t('profile.preferences')}
                  </div>
                </SelectItem>
                <SelectItem value="notifications">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    {t('profile.notifications')}
                  </div>
                </SelectItem>
                <SelectItem value="roles">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('profile.rolesAccess')}
                  </div>
                </SelectItem>
                <SelectItem value="contracts">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('profile.contractsPlanning')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            // Desktop: tabs tradizionali
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('profile.profile')}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('profile.preferences')}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('profile.notifications')}
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('profile.rolesAccess')}
              </TabsTrigger>
              <TabsTrigger value="contracts" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('profile.contractsPlanning')}
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.profileInfo')}</CardTitle>
                <CardDescription>
                  {t('profile.updatePersonalInfo')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Fields - Touch-friendly */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="first_name" className="text-sm sm:text-base">
                      {t('profile.firstName')}
                    </Label>
                    <Input
                      id="first_name"
                      value={profile.first_name || ''}
                      onChange={(e) => updateProfile('first_name', e.target.value)}
                      placeholder={t('profile.firstNamePlaceholder')}
                      className="min-h-[44px] text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name" className="text-sm sm:text-base">
                      {t('profile.lastName')}
                    </Label>
                    <Input
                      id="last_name"
                      value={profile.last_name || ''}
                      onChange={(e) => updateProfile('last_name', e.target.value)}
                      placeholder={t('profile.lastNamePlaceholder')}
                      className="min-h-[44px] text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm sm:text-base">
                      {t('profile.phone')}
                    </Label>
                    <PhoneInput
                      value={profile.phone || ''}
                      onChange={(value) => updateProfile('phone', value || '')}
                      placeholder={t('profile.phonePlaceholder')}
                      className="min-h-[44px]"
                    />
                    {profile.phone && !isValidPhoneNumber(profile.phone) && (
                      <p className="text-sm text-destructive mt-1">
                        {t('profile.phoneInvalid')}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">
                      {t('profile.email')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t('profile.emailPlaceholder')}
                      disabled={isChangingEmail}
                      className="min-h-[44px] text-base"
                    />
                    {newEmail !== user.email && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                        <Mail className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                          {t('profile.emailChangeWarning')}
                        </p>
                      </div>
                    )}
                    {emailPendingVerification && (
                      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-700">
                            {t('profile.emailPendingVerification')}
                          </p>
                          <p className="text-xs text-blue-600">
                            {t('profile.emailPendingMessage')}: {emailPendingVerification}
                          </p>
                          <p className="text-xs text-blue-600">
                            {t('profile.checkSpam')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile.preferences')}</CardTitle>
                <CardDescription>
                  {t('profile.customizeExperience')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="locale" className="text-sm sm:text-base">
                    {t('profile.language')}
                  </Label>
                  <Select
                    value={profile.locale || locale}
                    onValueChange={(value) => {
                      updateProfile('locale', value);
                      setLocale(value as 'it' | 'en');
                    }}
                  >
                    <SelectTrigger className="min-h-[44px]">
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
                  <Label htmlFor="timezone" className="text-sm sm:text-base">
                    {t('profile.timezone')}
                  </Label>
                  <Select
                    value={profile.timezone || 'Europe/Rome'}
                    onValueChange={(value) => updateProfile('timezone', value)}
                  >
                    <SelectTrigger className="min-h-[44px]">
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
                    <Label>{t('profile.marketing')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.marketingDescription')}
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
                      <Label>{t('profile.testEmailConfig')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.testEmailDescription')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                        variant="outline"
                        className={isMobile ? "w-full min-h-[44px]" : ""}
                      >
                        {isTestingEmail ? (
                          <Loader2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 animate-spin`} />
                        ) : (
                          <Mail className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                        )}
                        {isTestingEmail ? t('profile.sending') : t('profile.sendTestEmail')}
                      </Button>
                      {lastEmailTest && (
                        <p className="text-sm text-muted-foreground">
                          {t('profile.lastTest')}: {lastEmailTest}
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
                <CardTitle>{t('profile.notificationPreferences')}</CardTitle>
                <CardDescription>
                  {t('profile.controlNotifications')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('profile.emailNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.receiveEmailNotif')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.email_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('email_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('profile.systemNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.systemNotifDescription')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.system_notifications || true}
                      onCheckedChange={(checked) => updateNotificationPref('system_notifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('profile.activityNotifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('profile.activityNotifDescription')}
                      </p>
                    </div>
                    <Switch
                      checked={profile.notif_prefs?.activity_notifications || false}
                      onCheckedChange={(checked) => updateNotificationPref('activity_notifications', checked)}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold mb-4">{t('profile.detailedEmailPreferences')}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('profile.chooseEmailTypes')}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('profile.rotaPublished')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.rotaPublishedDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={profile.email_preferences?.rota_published !== false}
                        onCheckedChange={(checked) => updateEmailPref('rota_published', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('profile.shiftChanges')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.shiftChangesDescription')}
                        </p>
                      </div>
                      <Switch
                        checked={profile.email_preferences?.shift_assignment_change !== false}
                        onCheckedChange={(checked) => updateEmailPref('shift_assignment_change', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('profile.leaveDecisions')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.leaveDecisionsDescription')}
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
                  <Label htmlFor="notif_json">{t('profile.advancedConfig')}</Label>
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
                    {t('settings.advancedConfigDescription')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NEW TAB: Contracts & Planning */}
          <TabsContent value="contracts" className="space-y-4">
            <UserContractsView 
              userId={userId} 
              isSchedulable={profile.is_schedulable ?? false} 
            />
          </TabsContent>

          {/* NEW TAB: Roles & Access */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('me.rolesAssigned')}
                </CardTitle>
                <CardDescription>
                  {t('me.rolesAssignedDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roles.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {t('common.messages.noRolesAtMoment')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{role.role_display_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {role.location_name ? `${t('me.locationLabel')}: ${role.location_name}` : t('me.global')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{t('common.active')}</Badge>
                          <ClientOnly fallback={<p className="text-xs text-muted-foreground mt-1">{t('me.since')} {role.assigned_at}</p>}>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('me.since')} {new Date(role.assigned_at).toLocaleDateString('it-IT')}
                            </p>
                          </ClientOnly>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('me.locationsAssigned')}
                </CardTitle>
                <CardDescription>
                  {t('me.locationsAssignedDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {t('common.messages.noLocationsAssigned')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center gap-3 p-4 rounded-lg border"
                      >
                        <MapPin className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
                        <div>
                          <p className="font-medium text-base">{location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {roles.filter(r => r.location_id === location.id).length} {roles.filter(r => r.location_id === location.id).length === 1 ? t('me.rolesCount') : t('me.rolesCountPlural')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}