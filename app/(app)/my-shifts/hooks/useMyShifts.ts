'use client'

import useSWR from 'swr'
import type { ShiftWithAssignments } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyShifts() {
  const { data, error, mutate } = useSWR<{ shifts: ShiftWithAssignments[] }>(
    '/api/v1/shifts/my-shifts',
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
