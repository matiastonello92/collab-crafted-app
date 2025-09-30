'use client'

import useSWR from 'swr'
import type { Availability } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyAvailability() {
  const { data, error, mutate } = useSWR<{ availability: Availability[] }>(
    '/api/v1/availability',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    availability: data?.availability || [],
    loading: !error && !data,
    error,
    mutate
  }
}
