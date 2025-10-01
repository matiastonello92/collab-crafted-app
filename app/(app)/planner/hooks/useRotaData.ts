'use client'

import useSWR from 'swr'
import { useAppStore } from '@/lib/store/unified'
import type { Rota, ShiftWithAssignments, LeaveRequest } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to fetch')
  }
  return res.json()
}

interface LeaveRequestWithType extends LeaveRequest {
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
  }
  profiles: {
    id: string
    full_name: string | null
  }
}

export function useRotaData(locationId: string | null, weekStart: string) {
  const hasHydrated = useAppStore(state => state.hasHydrated)
  
  // Fetch rotas for location and week - wait for hydration
  const { data: rotaData, error: rotaError, mutate: mutateRota } = useSWR(
    hasHydrated && locationId ? `/api/v1/rotas?location_id=${locationId}&week=${weekStart}` : null,
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

  // Fetch approved leaves for the week - wait for hydration
  const { data: leavesData, error: leavesError, mutate: mutateLeaves } = useSWR(
    hasHydrated && locationId && weekStart
      ? `/api/v1/leave/requests?location_id=${locationId}&week_start=${weekStart}&status=approved`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min
    }
  )
  
  const mutate = () => {
    mutateRota()
    mutateShifts()
    mutateLeaves()
  }
  
  return {
    rota,
    shifts: (shiftsData?.shifts || []) as ShiftWithAssignments[],
    leaves: (leavesData?.requests || []) as LeaveRequestWithType[],
    loading: (!rotaError && !rotaData) || (!shiftsError && !shiftsData && !!rota) || (!leavesError && !leavesData),
    error: rotaError || shiftsError || leavesError,
    mutate
  }
}
