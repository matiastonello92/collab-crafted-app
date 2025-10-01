'use client'

import useSWR from 'swr'
import { useAppStore } from '@/lib/store/unified'
import type { ShiftWithAssignments } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyShifts() {
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  const { data, error, mutate } = useSWR<{ shifts: ShiftWithAssignments[] }>(
    hasHydrated ? '/api/v1/shifts/my-shifts' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    shifts: data?.shifts || [],
    loading: !error && !data,
    error,
    mutate
  }
}
