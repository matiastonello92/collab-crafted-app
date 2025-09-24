import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Mail, MapPin, Shield, Settings, Building } from 'lucide-react'
import Link from 'next/link'

export const runtime = 'nodejs'

interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

interface UserRole {
  role_name: string
  role_display_name: string
  location_name?: string
  location_id?: string
  assigned_at: string
}

async function getUserData(): Promise<{
  profile: UserProfile
  roles: UserRole[]
  locations: Array<{ id: string; name: string }>
}> {
  const supabase = await createSupabaseUserClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = {
    id: user.id,
    email: user.email || '',
    first_name: profileData?.first_name,
    last_name: profileData?.last_name,
    phone: profileData?.phone,
  }

  // Get user roles and locations
  const { data: rolesData } = await supabase
    .from('user_roles_locations')
    .select(`
      assigned_at,
      is_active,
      roles!inner (
        name,
        display_name
      ),
      locations (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  const roles: UserRole[] = rolesData?.map(assignment => ({
    role_name: (assignment.roles as any).name,
    role_display_name: (assignment.roles as any).display_name,
    location_name: (assignment.locations as any)?.name,
    location_id: (assignment.locations as any)?.id,
    assigned_at: assignment.assigned_at
  })) || []

  // Get all assigned locations
  const assignedLocationIds = roles
    .filter(r => r.location_id)
    .map(r => r.location_id!)
    .filter((id, index, arr) => arr.indexOf(id) === index)

  const { data: locationsData } = await supabase
    .from('locations')
    .select('id, name')
    .in('id', assignedLocationIds.length > 0 ? assignedLocationIds : [''])

  return {
    profile,
    roles,
    locations: locationsData || []
  }
}

export default async function MePage() {
  const { profile, roles, locations } = await getUserData()

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.first_name || profile.email.split('@')[0]

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8" />
            Il Mio Profilo
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualizza le tue informazioni personali e le tue assegnazioni
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informazioni Personali
          </CardTitle>
          <CardDescription>
            I tuoi dati personali e di contatto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nome Completo</p>
                <p className="text-sm text-muted-foreground">
                  {displayName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>

            {profile.phone && (
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Telefono</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.phone}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Modifica Profilo
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Aggiorna le tue informazioni personali
                </p>
              </div>
              <Button disabled variant="outline">
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Ruoli Assegnati
          </CardTitle>
          <CardDescription>
            I ruoli attivi per ogni location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nessun ruolo assegnato al momento
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
                        {role.location_name ? `Location: ${role.location_name}` : 'Globale'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Attivo</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dal {new Date(role.assigned_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Assegnate
          </CardTitle>
          <CardDescription>
            Le location a cui hai accesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nessuna location assegnata
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{location.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {roles.filter(r => r.location_id === location.id).length} ruol{roles.filter(r => r.location_id === location.id).length === 1 ? 'o' : 'i'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="flex justify-start">
        <Button asChild variant="outline">
          <Link href="/">
            Torna alla Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}