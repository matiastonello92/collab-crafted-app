import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { LocationInfoTab } from './components/LocationInfoTab'
import { LocationScheduleTab } from './components/LocationScheduleTab' 
import { LocationManagersTab } from './components/LocationManagersTab'

interface Props {
  params: { id: string }
  searchParams: { tab?: string }
}

export default async function LocationDetailPage({ params, searchParams }: Props) {
  await requireAdmin()

  const supabase = await createSupabaseServerClient()

  // Fetch location details
  const { data: location, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !location) {
    console.error('Error fetching location:', error)
    redirect('/admin/locations')
  }

  const activeTab = searchParams.tab || 'info'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/locations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla Lista
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h1 className="text-3xl font-bold tracking-tight">{location.name}</h1>
              <Badge variant={location.is_active ? "default" : "secondary"}>
                {location.is_active ? "Attivo" : "Archiviato"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {location.city}, {location.country}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informazioni</TabsTrigger>
          <TabsTrigger value="schedule">Orari</TabsTrigger>
          <TabsTrigger value="managers">Responsabili</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <LocationInfoTab location={location} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <LocationScheduleTab location={location} />
        </TabsContent>

        <TabsContent value="managers" className="mt-6">
          <LocationManagersTab locationId={location.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}