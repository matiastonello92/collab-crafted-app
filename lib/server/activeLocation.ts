import { cookies } from 'next/headers'

import { createSupabaseUserClient } from '@/lib/supabase/clients'

type Loc = { id: string; name: string | null; org_id: string | null }
type Meta = { error?: string }

export async function getUserLocations(): Promise<{ user: { id: string } | null; locations: Loc[]; meta: Meta }> {
  try {
    const supabase = await createSupabaseUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { user: null, locations: [], meta: {} }

    const { data: mems, error } = await supabase
      .from('user_roles_locations')
      .select('org_id, location_id, locations(id,name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      console.error('[activeLocation] memberships error', error)
      return { user, locations: [], meta: { error: 'memberships' } }
    }

    const map = new Map<string, Loc>()
    for (const item of mems ?? []) {
      const locationId = (item as any)?.location_id as string | null
      if (!locationId || map.has(locationId)) continue
      const location = (item as any)?.locations ?? {}
      map.set(locationId, {
        id: locationId,
        name: location?.name ?? null,
        org_id: (item as any)?.org_id ?? null
      })
    }

    const locations = Array.from(map.values()).sort((a, b) => {
      return (a.name ?? '').localeCompare(b.name ?? '')
    })

    return { user, locations, meta: {} }
  } catch (err) {
    console.error('[activeLocation] getUserLocations fatal', err)
    return { user: null, locations: [], meta: { error: 'fatal' } }
  }
}

export async function getActiveLocationServer(): Promise<{ active: Loc | null; locations: Loc[]; persisted: boolean; meta: Meta }> {
  try {
    const jar = await cookies()
    const cookieId = jar.get('pn_loc')?.value ?? null

    const { user, locations, meta } = await getUserLocations()
    if (!user || locations.length === 0) return { active: null, locations, persisted: false, meta }

    const byCookie = locations.find(l => l.id === cookieId) ?? null
    const active = byCookie ?? locations[0]
    const persisted = !!byCookie

    return { active, locations, persisted, meta }
  } catch (err) {
    console.error('[activeLocation] getActiveLocationServer fatal', err)
    return { active: null, locations: [], persisted: false, meta: { error: 'fatal' } }
  }
}

