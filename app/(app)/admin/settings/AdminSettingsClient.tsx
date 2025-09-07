'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail, Send, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface EnvStatus {
  resendApiKey: boolean
  resendFrom: boolean
}

interface AdminSettingsClientProps {
  envStatus: EnvStatus
}

export function AdminSettingsClient({ envStatus }: AdminSettingsClientProps) {
  const [email, setEmail] = useState('matias@pecoranegra.fr')
  const [isSending, setIsSending] = useState(false)

  const handleSendTest = async () => {
    if (!email.trim()) {
      toast.error('Inserisci un indirizzo email valido')
      return
    }

    setIsSending(true)
    
    try {
      const response = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: email.trim() })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Email di test inviata con successo a ${email}`)
      } else {
        toast.error(`Errore nell'invio: ${result.error}`)
      }
    } catch (error) {
      console.error('Send test email error:', error)
      toast.error('Errore di connessione durante l\'invio dell\'email')
    } finally {
      setIsSending(false)
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
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
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
  )
}