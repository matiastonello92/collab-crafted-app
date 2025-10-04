import { requireOrgAdmin } from '@/lib/admin/guards'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { orgFeatureLimits } from '@/lib/server/features'
import AdminLocationsClient from './AdminLocationsClient'

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
    <AdminLocationsClient
      locations={locations || []}
      currentCount={currentCount}
      maxLocations={maxLocations}
      canAddLocation={canAddLocation}
    />
  )
}