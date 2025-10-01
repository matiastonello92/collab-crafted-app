'use client'

import useSWR from 'swr'
import { useAppStore } from '@/lib/store/unified'
import type { Availability } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyAvailability() {
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  const { data, error, mutate } = useSWR<{ availability: Availability[] }>(
    hasHydrated ? '/api/v1/availability' : null,
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
