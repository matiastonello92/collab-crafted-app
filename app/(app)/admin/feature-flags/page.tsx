import { requireAdmin } from '@/lib/admin/guards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Flag, Plus, Search, Filter, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export const runtime = 'nodejs'

export default async function FeatureFlagsPage() {
  // Ensure user has admin permissions
  await requireAdmin()

  // Mock data for the placeholder
  const mockFlags = [
    { name: 'inventory_advanced_search', status: 'active', scope: 'global', description: 'Ricerca avanzata nell\'inventario' },
    { name: 'supplier_integration', status: 'active', scope: 'lyon', description: 'Integrazione fornitori automatica' },
    { name: 'task_automation', status: 'inactive', scope: 'global', description: 'Automazione task ricorrenti' },
    { name: 'mobile_notifications', status: 'active', scope: 'menton', description: 'Notifiche push mobile' },
    { name: 'advanced_reporting', status: 'inactive', scope: 'global', description: 'Report avanzati e analytics' },
    { name: 'chat_integration', status: 'active', scope: 'global', description: 'Sistema chat integrato' },
  ]

  const totalFlags = mockFlags.length
  const activeFlags = mockFlags.filter(f => f.status === 'active').length
  const inactiveFlags = totalFlags - activeFlags

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Admin
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Flag className="h-8 w-8" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestisci le funzionalità attive per location e moduli
          </p>
        </div>
        <Button disabled className="gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Flag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalFlags}</p>
                <p className="text-sm text-muted-foreground">Flag Totali</p>
              </div>
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{activeFlags}</p>
                <p className="text-sm text-muted-foreground">Attivi</p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Attivi
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">{inactiveFlags}</p>
                <p className="text-sm text-muted-foreground">Inattivi</p>
              </div>
              <Badge variant="outline">
                Inattivi
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Configurazione delle funzionalità per location e moduli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca feature flags..."
                  className="pl-10"
                  disabled
                />
              </div>
            </div>
            <Button variant="outline" disabled className="gap-2">
              <Filter className="h-4 w-4" />
              Filtri
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Flag</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="w-24">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockFlags.map((flag, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {flag.name}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={flag.status === 'active' ? 'default' : 'outline'}
                        className={flag.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {flag.status === 'active' ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {flag.scope === 'global' ? 'Globale' : flag.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {flag.description}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled>
                        Modifica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Placeholder UI:</strong> Questa è una versione dimostrativa. 
              Le funzionalità di modifica e creazione flag saranno implementate nel prossimo step.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}