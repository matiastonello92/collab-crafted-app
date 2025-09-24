'use server'

import { cookies } from 'next/headers'

import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { getUserLocations } from '@/lib/server/activeLocation'
import { loadAuthenticatedState } from '@/lib/server/session-context'

export async function setActiveLocation(locationId?: string | null) {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const jar = await cookies()

  if (!locationId) {
    jar.delete('pn_loc')
    return loadAuthenticatedState()
  }

  const { locations } = await getUserLocations()
  const allowed = locations.some((loc) => loc.id === locationId)
  if (!allowed) {
    throw new Error('Forbidden')
  }

  jar.set('pn_loc', locationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90
  })

  return loadAuthenticatedState()
}

