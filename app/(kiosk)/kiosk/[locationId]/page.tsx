// Klyra Shifts - Kiosk Time Clock Page

import { KioskClient } from './KioskClient'
import { generateKioskToken } from '@/lib/kiosk/token'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function KioskPage({
  params
}: {
  params: { locationId: string }
}) {
  const supabase = await createSupabaseServerClient()

  // Verify location exists
  const { data: location, error } = await supabase
    .from('locations')
    .select('name, org_id')
    .eq('id', params.locationId)
    .single()

  if (error || !location) {
    redirect('/404')
  }

  // Generate kiosk token for this location
  const kioskToken = generateKioskToken(params.locationId)

  return (
    <KioskClient
      locationId={params.locationId}
      locationName={location.name}
      kioskToken={kioskToken}
    />
  )
}
