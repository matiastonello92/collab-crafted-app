import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Wrench, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Impostazioni
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura il sistema e le tue preferenze
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Wrench className="h-10 w-10 text-muted-foreground" />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  La sezione impostazioni è in fase di sviluppo
                </p>
                <p className="text-muted-foreground">
                  Qui potrai configurare le tue preferenze, gestire le notifiche,
                  personalizzare l&apos;interfaccia e molto altro.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Profilo Utente</CardTitle>
                    <CardDescription>
                      Gestisci le tue informazioni personali
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Notifiche</CardTitle>
                    <CardDescription>
                      Configura avvisi e notifiche
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Sicurezza</CardTitle>
                    <CardDescription>
                      Password e autenticazione
                    </CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Integrazione</CardTitle>
                    <CardDescription>
                      API keys e servizi esterni
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <div className="pt-6">
                <Button asChild>
                  <Link href="/">
                    Torna alla Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}