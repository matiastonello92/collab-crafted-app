'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Flag, Plus, Settings, MapPin, Globe } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useRequireSession } from '@/lib/useRequireSession'

// Mock data for demonstration
const mockFlags = [
  {
    id: '1',
    module_code: 'orders',
    flag_code: 'auto_approval',
    name: 'Auto Approval Ordini',
    description: 'Approva automaticamente gli ordini sotto una certa soglia',
    enabled: false,
    scope: 'global',
    location_id: null,
    location_name: null
  },
  {
    id: '2',
    module_code: 'chat',
    flag_code: 'real_time',
    name: 'Chat Real-time',
    description: 'Abilita messaggistica in tempo reale',
    enabled: true,
    scope: 'global',
    location_id: null,
    location_name: null
  },
  {
    id: '3',
    module_code: 'inventory',
    flag_code: 'advanced_tracking',
    name: 'Tracking Avanzato',
    description: 'Sistema di tracciamento avanzato per inventario',
    enabled: true,
    scope: 'location',
    location_id: '1',
    location_name: 'Lyon'
  },
  {
    id: '4',
    module_code: 'inventory',
    flag_code: 'advanced_tracking',
    name: 'Tracking Avanzato',
    description: 'Sistema di tracciamento avanzato per inventario',
    enabled: false,
    scope: 'location',
    location_id: '2',
    location_name: 'Menton'
  }
]

const mockModules = [
  'locations', 'inventory', 'technicians', 'incidents', 'suppliers', 'orders', 'tasks', 'chat', 'api'
]

export default function FeatureFlagsPage() {
  const { hasPermission } = useAppStore()
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [selectedScope, setSelectedScope] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Check if user can manage feature flags
  const canManageFlags = hasPermission('locations.manage_flags')

  if (!canManageFlags) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Flag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Accesso Negato</h3>
              <p className="text-muted-foreground">
                Non hai i permessi necessari per gestire i feature flags.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredFlags = mockFlags.filter(flag => {
    if (selectedModule !== 'all' && flag.module_code !== selectedModule) return false
    if (selectedScope !== 'all') {
      if (selectedScope === 'global' && flag.scope !== 'global') return false
      if (selectedScope === 'location' && flag.scope !== 'location') return false
    }
    return true
  })

  const toggleFlag = (flagId: string) => {
    // In a real app, this would make an API call
    console.log('Toggling flag:', flagId)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">
            Gestisci le funzionalità attive per moduli e location
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Feature Flag</DialogTitle>
              <DialogDescription>
                Configura un nuovo feature flag per controllare le funzionalità
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="module">Modulo</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona modulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockModules.map((module) => (
                        <SelectItem key={module} value={module}>
                          {module}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="flag_code">Codice Flag</Label>
                  <Input id="flag_code" placeholder="es. advanced_feature" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" placeholder="Nome descrittivo del flag" />
              </div>
              
              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea id="description" placeholder="Descrizione della funzionalità" />
              </div>
              
              <div>
                <Label htmlFor="scope">Ambito</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona ambito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Globale (tutta l&apos;organizzazione)</SelectItem>
                    <SelectItem value="location">Per Location</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="enabled" />
                <Label htmlFor="enabled">Attivo di default</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Crea Flag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tutti i moduli" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i moduli</SelectItem>
                {mockModules.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tutti gli ambiti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli ambiti</SelectItem>
                <SelectItem value="global">Solo globali</SelectItem>
                <SelectItem value="location">Solo per location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags Attivi
          </CardTitle>
          <CardDescription>
            Gestisci le funzionalità attive per la tua organizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Modulo</TableHead>
                <TableHead>Ambito</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{flag.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {flag.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {flag.module_code}.{flag.flag_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{flag.module_code}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {flag.scope === 'global' ? (
                        <>
                          <Globe className="h-4 w-4" />
                          <span>Globale</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4" />
                          <span>{flag.location_name}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={() => toggleFlag(flag.id)}
                      />
                      <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                        {flag.enabled ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Modifica
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flags Totali</p>
                <p className="text-2xl font-bold">{mockFlags.length}</p>
              </div>
              <Flag className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flags Attivi</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockFlags.filter(f => f.enabled).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flags Globali</p>
                <p className="text-2xl font-bold">
                  {mockFlags.filter(f => f.scope === 'global').length}
                </p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Per Location</p>
                <p className="text-2xl font-bold">
                  {mockFlags.filter(f => f.scope === 'location').length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
