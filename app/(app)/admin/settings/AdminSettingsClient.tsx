'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Settings, Mail, Check, X, AlertTriangle, Upload, Building, Shield, Megaphone, Image, Send, CheckCircle, XCircle, Save, RotateCcw, History } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { setAppSetting, uploadLogo } from '@/app/actions/app-settings'
import { saveBanner, getBannerHistory, republishBanner } from '@/app/actions/banner'

interface EnvStatus {
  resendApiKey: boolean
  resendFrom: boolean
}

interface BannerHistoryItem {
  id: string
  message: string
  status: string
  published_at: string | null
  created_at: string
  created_by: string | null
}

interface AppSettings {
  branding: any
  business: any
  access: any
  banner: any
}

interface AdminSettingsClientProps {
  envStatus: EnvStatus
  appSettings: AppSettings
}

export function AdminSettingsClient({ envStatus, appSettings }: AdminSettingsClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState('matias@pecoranegra.fr')
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  // Server state (source of truth)
  const [serverSettings, setServerSettings] = useState(appSettings)
  
  // Local state for form inputs
  const [localBusiness, setLocalBusiness] = useState(appSettings.business || {})
  const [localAccess, setLocalAccess] = useState(appSettings.access || {})
  
  // Banner state - fully controlled and decoupled
  const [bannerEnabled, setBannerEnabled] = useState(!!appSettings.banner?.enabled)
  const [bannerMessage, setBannerMessage] = useState(appSettings.banner?.message || '')
  const [bannerHistory, setBannerHistory] = useState<BannerHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Saving states
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [savingBanner, setSavingBanner] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load banner history
  const loadBannerHistory = async () => {
    setLoadingHistory(true)
    try {
      const history = await getBannerHistory()
      setBannerHistory(history)
    } catch (error: any) {
      toast.error(`Errore caricamento storico: ${error.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Load history on mount
  useEffect(() => {
    loadBannerHistory()
  }, [])

  const handleSendTest = async () => {
    if (!email.trim()) {
      toast.error('Inserisci un indirizzo email')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('domain not verified') || data.error?.includes('from not authorized')) {
          toast.error(`Errore Resend: ${data.error}. Verifica il dominio su resend.com/domains`)
        } else {
          toast.error(data.error || 'Errore sconosciuto')
        }
        return
      }

      if (data.id) {
        toast.success(`Email inviata! ID: ${data.id}`)
      } else {
        toast.error('Email inviata ma nessun ID ricevuto')
      }
    } catch (error: any) {
      toast.error(`Errore nell'invio: ${error.message}`)
    } finally {
      setIsSending(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      
      const logoUrl = await uploadLogo(formData)
      
      // Update server state optimistically
      const newBranding = { ...serverSettings.branding, logo_url: logoUrl }
      setServerSettings(prev => ({
        ...prev,
        branding: newBranding
      }))
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      toast.success('Logo caricato con successo!')
    } catch (error: any) {
      toast.error(`Errore nel caricamento: ${error.message}`)
      // Reset file input on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setIsUploading(false)
    }
  }

  const saveBusiness = async () => {
    setSavingBusiness(true)
    try {
      await setAppSetting('business', localBusiness)
      setServerSettings(prev => ({ ...prev, business: localBusiness }))
      toast.success('Informazioni aziendali salvate!')
    } catch (error: any) {
      toast.error(`Errore nel salvataggio: ${error.message}`)
      // Rollback on error
      setLocalBusiness(serverSettings.business || {})
    } finally {
      setSavingBusiness(false)
    }
  }

  const saveAccess = async () => {
    setSavingAccess(true)
    try {
      await setAppSetting('access', localAccess)
      setServerSettings(prev => ({ ...prev, access: localAccess }))
      toast.success('Impostazioni accesso salvate!')
    } catch (error: any) {
      toast.error(`Errore nel salvataggio: ${error.message}`)
      // Rollback on error
      setLocalAccess(serverSettings.access || {})
    } finally {
      setSavingAccess(false)
    }
  }

  const handleSaveBanner = async () => {
    setSavingBanner(true)
    try {
      await saveBanner(bannerMessage, bannerEnabled)
      
      // Update server state
      const newBanner = { enabled: bannerEnabled, message: bannerMessage }
      setServerSettings(prev => ({ ...prev, banner: newBanner }))
      
      toast.success('Banner salvato!')
      router.refresh() // Force layout refresh to show/hide banner immediately
      
      // Reload history to show the new entry
      loadBannerHistory()
    } catch (error: any) {
      toast.error(`Errore nel salvataggio: ${error.message}`)
      // Rollback on error
      setBannerEnabled(!!serverSettings.banner?.enabled)
      setBannerMessage(serverSettings.banner?.message || '')
    } finally {
      setSavingBanner(false)
    }
  }

  const handleRepublishBanner = async (id: string) => {
    try {
      await republishBanner(id)
      
      // Reload current banner state from history
      const historyItem = bannerHistory.find(h => h.id === id)
      if (historyItem) {
        setBannerEnabled(true)
        setBannerMessage(historyItem.message)
        
        const newBanner = { enabled: true, message: historyItem.message }
        setServerSettings(prev => ({ ...prev, banner: newBanner }))
      }
      
      toast.success('Banner ripubblicato!')
      router.refresh() // Force layout refresh
      loadBannerHistory() // Reload history
    } catch (error: any) {
      toast.error(`Errore nella ripubblicazione: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
            Torna alla Console Admin
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Impostazioni Admin</h1>
          <p className="text-muted-foreground">
            Configurazione e test dei servizi di sistema
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="space-y-6">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Accesso
            </TabsTrigger>
            <TabsTrigger value="banner" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Banner
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                  Gestisci logo e elementi visuali dell'app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo aziendale</Label>
                  <div className="mt-2 space-y-4">
                    {serverSettings.branding?.logo_url && (
                      <div className="flex items-center gap-4">
                        <img 
                          src={serverSettings.branding.logo_url} 
                          alt="Logo" 
                          className="h-16 w-16 object-contain rounded border"
                        />
                        <div>
                          <p className="text-sm text-muted-foreground">Logo corrente</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        variant="outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Caricamento...' : 'Carica nuovo logo'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni aziendali</CardTitle>
                <CardDescription>
                  Dati legali e di contatto dell'azienda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="legal_name">Ragione sociale</Label>
                  <Input
                    id="legal_name"
                    value={localBusiness.legal_name || ''}
                    onChange={(e) => setLocalBusiness((prev: any) => ({ ...prev, legal_name: e.target.value }))}
                    placeholder="Es: Pecora Negra S.r.l."
                  />
                </div>
                <div>
                  <Label htmlFor="vat_number">Partita IVA</Label>
                  <Input
                    id="vat_number"
                    value={localBusiness.vat_number || ''}
                    onChange={(e) => setLocalBusiness((prev: any) => ({ ...prev, vat_number: e.target.value }))}
                    placeholder="Es: IT12345678901"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Indirizzo</Label>
                  <Textarea
                    id="address"
                    value={localBusiness.address || ''}
                    onChange={(e) => setLocalBusiness((prev: any) => ({ ...prev, address: e.target.value }))}
                    placeholder="Indirizzo completo dell'azienda"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="support_email">Email supporto</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={localBusiness.support_email || ''}
                    onChange={(e) => setLocalBusiness((prev: any) => ({ ...prev, support_email: e.target.value }))}
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="support_phone">Telefono supporto</Label>
                  <Input
                    id="support_phone"
                    value={localBusiness.support_phone || ''}
                    onChange={(e) => setLocalBusiness((prev: any) => ({ ...prev, support_phone: e.target.value }))}
                    placeholder="+39 123 456 7890"
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={saveBusiness}
                    disabled={savingBusiness}
                    className="w-full sm:w-auto"
                  >
                    {savingBusiness ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salva informazioni aziendali
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controllo accessi</CardTitle>
                <CardDescription>
                  Gestisci chi può registrarsi e accedere all'app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="signup_mode">Modalità registrazione</Label>
                  <Select
                    value={localAccess.signup_mode || 'invite_only'}
                    onValueChange={(value) => setLocalAccess((prev: any) => ({ ...prev, signup_mode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invite_only">Solo su invito</SelectItem>
                      <SelectItem value="open">Registrazione aperta</SelectItem>
                      <SelectItem value="closed">Registrazione chiusa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="allowed_domains">Domini email autorizzati</Label>
                  <Textarea
                    id="allowed_domains"
                    value={(localAccess.allowed_domains || []).join('\n')}
                    onChange={(e) => {
                      const domains = e.target.value.split('\n').filter(d => d.trim())
                      setLocalAccess((prev: any) => ({ ...prev, allowed_domains: domains }))
                    }}
                    placeholder="example.com&#10;company.it&#10;altro-dominio.org"
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Un dominio per riga. Lascia vuoto per permettere qualsiasi dominio.
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    onClick={saveAccess}
                    disabled={savingAccess}
                    className="w-full sm:w-auto"
                  >
                    {savingAccess ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salva impostazioni accesso
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Banner sistema</CardTitle>
                <CardDescription>
                  Mostra messaggi importanti a tutti gli utenti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Banner Editor */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="banner_enabled"
                      checked={bannerEnabled}
                      onCheckedChange={setBannerEnabled}
                      aria-label="Attiva banner"
                    />
                    <Label htmlFor="banner_enabled">Banner attivo</Label>
                  </div>
                  <div>
                    <Label htmlFor="banner_message">Messaggio banner</Label>
                    <Textarea
                      id="banner_message"
                      value={bannerMessage}
                      onChange={(e) => setBannerMessage(e.target.value)}
                      placeholder="Messaggio da mostrare nel banner..."
                      rows={3}
                      disabled={!bannerEnabled}
                    />
                  </div>
                  {bannerEnabled && bannerMessage && (
                    <div>
                      <Label>Anteprima</Label>
                      <Alert className="mt-2 bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          {bannerMessage}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button 
                      onClick={handleSaveBanner}
                      disabled={savingBanner}
                      className="w-full sm:w-auto"
                    >
                      {savingBanner ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salva
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Banner History */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-4 w-4" />
                    <h4 className="font-medium">Storico Banner</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadBannerHistory}
                      disabled={loadingHistory}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Ricarica
                    </Button>
                  </div>
                  
                  {loadingHistory ? (
                    <div className="text-sm text-muted-foreground">Caricamento storico...</div>
                  ) : bannerHistory.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {bannerHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 border rounded-lg bg-muted/30 space-y-2"
                        >
                          <div className="text-sm font-medium truncate">
                            {item.message}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {item.published_at 
                                ? new Date(item.published_at).toLocaleString('it-IT')
                                : new Date(item.created_at).toLocaleString('it-IT')
                              }
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRepublishBanner(item.id)}
                              className="h-6 text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Ripubblica
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nessun banner nello storico
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            {/* Environment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Stato Configurazione Email</CardTitle>
                <CardDescription>
                  Verifica della configurazione delle variabili d'ambiente Resend
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Key presente:</span>
                  <Badge variant={envStatus.resendApiKey ? "default" : "destructive"}>
                    {envStatus.resendApiKey ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sì
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        No
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">From address presente:</span>
                  <Badge variant={envStatus.resendFrom ? "default" : "destructive"}>
                    {envStatus.resendFrom ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sì
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        No
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card>
              <CardHeader>
                <CardTitle>Test Invio Email</CardTitle>
                <CardDescription>
                  Invia un'email di test per verificare che la configurazione Resend funzioni correttamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Destinatario</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <Button 
                  onClick={handleSendTest}
                  disabled={isSending || !envStatus.resendApiKey || !envStatus.resendFrom}
                  className="w-full sm:w-auto"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Invia Test
                    </>
                  )}
                </Button>
                
                {(!envStatus.resendApiKey || !envStatus.resendFrom) && (
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Configurazione email incompleta. Verifica le variabili d'ambiente RESEND_API_KEY e RESEND_FROM.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}