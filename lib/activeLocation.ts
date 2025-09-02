'use server';

import { cookies } from 'next/headers'

export async function setActiveLocationAction(locationId?: string | null) {
  if (!locationId) {
    cookies().delete('pn_loc')
    return
  }

  cookies().set('pn_loc', locationId, { path: '/', maxAge: 60 * 60 * 24 * 90 })
}

