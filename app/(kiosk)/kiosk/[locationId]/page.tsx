// Klyra Shifts - Kiosk Time Clock Page

import { KioskClient } from './KioskClient'
import { generateKioskToken } from '@/lib/kiosk/token'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function KioskPage({
  params
}: {
  params: Promise<{ locationId: string }>
}) {
  const { locationId } = await params
  const supabase = await createSupabaseServerClient()

  // Verify location exists
  const { data: location, error } = await supabase
    .from('locations')
    .select('name, org_id')
    .eq('id', locationId)
    .single()

  if (error || !location) {
    redirect('/404')
  }

  // Generate kiosk token for this location
  const kioskToken = generateKioskToken(locationId)

  return (
    <KioskClient
      locationId={locationId}
      locationName={location.name}
      kioskToken={kioskToken}
      orgId={location.org_id}
    />
  )
}
