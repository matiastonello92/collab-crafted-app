'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/utils/supabase/server'

interface Location {
  id: string
  name: string
}

export async function setActiveLocationAction(id: string) {
  const cookieStore = cookies()
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return
    }
    const { data, error } = await supabase
      .from('user_roles_locations')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('location_id', id)
      .eq('is_active', true)
      .single()
    if (error || !data) {
      cookieStore.set({ name: 'x-active-location', value: '', path: '/', maxAge: 0 })
      revalidatePath('/')
      return
    }
    cookieStore.set({
      name: 'x-active-location',
      value: id,
      path: '/',
      httpOnly: true,
    })
    revalidatePath('/')
  } catch (e) {
    console.error('setActiveLocationAction error', e)
  }
}

export async function getActiveLocation(cookieStore: ReturnType<typeof cookies>): Promise<Location | null> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }
    const { data: memberships, error } = await supabase
      .from('user_roles_locations')
      .select('location_id, locations(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    if (error || !memberships) {
      return null
    }
    const locations = memberships
      .map((m: any) => m.locations)
      .filter((l: any): l is Location => !!l)
    if (locations.length === 0) {
      return null
    }
    const cookieId = cookieStore.get('x-active-location')?.value
    let active = locations.find(l => l.id === cookieId) || null
    if (!active) {
      active = locations[0]
      cookieStore.set({
        name: 'x-active-location',
        value: active.id,
        path: '/',
        httpOnly: true,
      })
    }
    return active
  } catch (e) {
    console.error('getActiveLocation error', e)
    return null
  }
}

