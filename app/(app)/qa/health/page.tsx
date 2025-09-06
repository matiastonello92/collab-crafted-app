import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Server, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/guards'

export const runtime = 'nodejs';
interface HealthCheckResult {
  status: string
  timestamp: string
  environment: string
  version: string
  supabase: {
    url: string
    anon_key_present: boolean
    service_role_present: boolean
  }
  env_vars: {
    name: string
    present: boolean
    masked_value?: string
  }[]
}

async function getHealthCheck(): Promise<HealthCheckResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/health`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Health check error:', error)
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: 'unknown',
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not_set',
        anon_key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      env_vars: []
    }
  }
}

export default async function QAHealthPage() {
  // Guard: require admin permissions
  await requireAdmin()
  
  const healthData = await getHealthCheck()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'default'
      case 'error': return 'destructive'
      default: return 'secondary'
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            QA: Health Check
          </h1>
          <p className="text-muted-foreground">
            Stato del sistema e configurazione ambiente
          </p>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Stato Sistema
          </CardTitle>
          <CardDescription>
            Controllo generale del servizio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(healthData.status)}>
                  {healthData.status}
                </Badge>
                {healthData.status === 'healthy' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Environment</label>
              <p className="text-sm font-mono">{healthData.environment}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Version</label>
              <p className="text-sm font-mono">{healthData.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
              <p className="text-sm">
                {new Date(healthData.timestamp).toLocaleString('it-IT')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurazione Supabase</CardTitle>
          <CardDescription>
            Stato delle variabili di configurazione Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Supabase URL</label>
              <p className="text-sm font-mono break-all">
                {healthData.supabase.url === 'not_set' ? (
                  <span className="text-red-500">NON CONFIGURATO</span>
                ) : (
                  healthData.supabase.url
                )}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Anon Key</label>
                <div className="flex items-center gap-2">
                  <Badge variant={healthData.supabase.anon_key_present ? 'default' : 'destructive'}>
                    {healthData.supabase.anon_key_present ? 'Presente' : 'Mancante'}
                  </Badge>
                  {healthData.supabase.anon_key_present ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Service Role Key</label>
                <div className="flex items-center gap-2">
                  <Badge variant={healthData.supabase.service_role_present ? 'default' : 'destructive'}>
                    {healthData.supabase.service_role_present ? 'Presente' : 'Mancante'}
                  </Badge>
                  {healthData.supabase.service_role_present ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      {healthData.env_vars && healthData.env_vars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variabili Ambiente</CardTitle>
            <CardDescription>
              Variabili NEXT_PUBLIC_* rilevate (valori mascherati per sicurezza)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData.env_vars.map((envVar, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium font-mono text-sm">{envVar.name}</p>
                    {envVar.masked_value && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {envVar.masked_value}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={envVar.present ? 'default' : 'destructive'}>
                      {envVar.present ? 'Presente' : 'Mancante'}
                    </Badge>
                    {envVar.present ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Health Data */}
      <Card>
        <CardHeader>
          <CardTitle>Dati Raw Health Check</CardTitle>
          <CardDescription>
            JSON completo della risposta health check per debugging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(healthData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}