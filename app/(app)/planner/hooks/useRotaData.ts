'use client'

import useSWR from 'swr'
import type { Rota, ShiftWithAssignments } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to fetch')
  }
  return res.json()
}

export function useRotaData(locationId: string | null, weekStart: string) {
  // Fetch rotas for location and week
  const { data: rotaData, error: rotaError, mutate: mutateRota } = useSWR(
    locationId ? `/api/v1/rotas?location_id=${locationId}&week=${weekStart}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min
    }
  )
  
  const rota = rotaData?.rotas?.[0] as Rota | undefined
  
  // Fetch shifts if rota exists
  const { data: shiftsData, error: shiftsError, mutate: mutateShifts } = useSWR(
    rota?.id ? `/api/v1/shifts?rota_id=${rota.id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s
    }
  )
  
  const mutate = () => {
    mutateRota()
    mutateShifts()
  }
  
  return {
    rota,
    shifts: (shiftsData?.shifts || []) as ShiftWithAssignments[],
    loading: (!rotaError && !rotaData) || (!shiftsError && !shiftsData && !!rota),
    error: rotaError || shiftsError,
    mutate
  }
}
