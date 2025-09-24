import { redirect } from 'next/navigation'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function LocationsManagePage() {
  const supabase = await createSupabaseUserClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get user's location assignments
  const { data: assignments, error } = await supabase
    .from('location_admins')
    .select(`
      location_id,
      locations!inner (
        id, name, city, country, is_active
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching assignments:', error)
    return <div>Error loading assignments</div>
  }

  const locations = assignments?.map(a => a.locations).flat() || []

  // Handle different cases
  if (locations.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nessuna Location Assegnata</h2>
          <p className="text-muted-foreground">
            Non sei stato assegnato a nessuna location come responsabile.
            Contatta un amministratore per ricevere le autorizzazioni necessarie.
          </p>
        </div>
      </div>
    )
  }

  if (locations.length === 1) {
    // Redirect directly to the schedule tab for the single location
    redirect(`/admin/locations/${locations[0].id}?tab=schedule`)
  }

  // Multiple locations - show list
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Le Mie Locations</h1>
        <p className="text-muted-foreground">
          Gestisci gli orari delle location di cui sei responsabile
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {location.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {location.city}, {location.country}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "Attivo" : "Archiviato"}
                </Badge>
                <Link href={`/admin/locations/${location.id}?tab=schedule`}>
                  <Button variant="outline" size="sm">
                    <Clock className="mr-2 h-4 w-4" />
                    Gestisci Orari
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}