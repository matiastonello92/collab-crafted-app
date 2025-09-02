import HeaderClient from './HeaderClient'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { getActiveLocation } from '@/lib/activeLocation'

export default async function Header() {
  const cookieStore = cookies()
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  let locations: { id: string, name: string }[] = []
  if (user) {
    const { data } = await supabase
      .from('user_roles_locations')
      .select('locations(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    locations = (data || [])
      .map((m: any) => m.locations)
      .filter((l: any): l is { id: string, name: string } => !!l)
  }
  const activeLocation = await getActiveLocation(cookieStore)
  return <HeaderClient locations={locations} activeLocation={activeLocation} />
}
