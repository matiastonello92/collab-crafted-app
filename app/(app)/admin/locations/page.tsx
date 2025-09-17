import { redirect } from 'next/navigation'
import { requireOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, MapPin, Eye } from 'lucide-react'
import Link from 'next/link'
import { orgFeatureLimits } from '@/lib/server/features'

export default async function AdminLocationsPage() {
  // Require admin access
  await requireOrgAdmin()

  const supabase = await createSupabaseServerClient()
  
  // Get user's org_id for feature limits
  const { data: { user } } = await supabase.auth.getUser()
  let orgId = null
  if (user) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()
    orgId = membership?.org_id
  }

  // Fetch all locations
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, city, country, is_active, updated_at')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching locations:', error)
    return <div>Error loading locations</div>
  }

  // Check location limits
  const currentCount = locations?.length || 0
  const limits = orgId ? await orgFeatureLimits(orgId, 'limits.locations') : {}
  const maxLocations = limits?.max
  const canAddLocation = !maxLocations || currentCount < maxLocations

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Locations</h1>
          <p className="text-muted-foreground">
            Gestisci le sedi aziendali e assegna i responsabili
            {maxLocations && ` (${currentCount}/${maxLocations})`}
          </p>
        </div>
        <Button asChild disabled={!canAddLocation}>
          <Link href="/admin/locations/create">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi Location
          </Link>
        </Button>
      </div>

      {/* Plan limit alert */}
      {maxLocations && currentCount >= maxLocations && (
        <Alert>
          <AlertDescription>
            Hai raggiunto il limite del piano ({maxLocations} locations). Aggiorna il tuo piano per aggiungerne altre.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Cerca per nome o città..."
              className="max-w-sm"
            />
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Archiviati</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locations ({locations?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Città</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ultimo Aggiornamento</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations?.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell>
                      {location.city}, {location.country}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active ? "Attivo" : "Archiviato"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(location.updated_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/locations/${location.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Apri
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}