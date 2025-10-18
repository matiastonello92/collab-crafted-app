import useSWR from 'swr'
import type { Rota, ShiftWithAssignments } from '@/types/shifts'

interface LeaveRequestWithType {
  id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  status: string
  reason: string | null
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

interface UnifiedRotaData {
  rota: Rota | null
  shifts: ShiftWithAssignments[]
  leaves: LeaveRequestWithType[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch planner data')
  return res.json()
}

export function useUnifiedRotaData(locationId: string | null, weekStart: string) {
  const url = locationId 
    ? `/api/v1/planner/data?location_id=${locationId}&week_start=${weekStart}`
    : null

  const { data, error, mutate, isLoading } = useSWR<UnifiedRotaData>(
    url,
    fetcher,
    {
      revalidateOnFocus: true, // Refresh when tab gets focus
      revalidateOnMount: true, // Force refresh on mount
      refreshInterval: 30000, // Poll every 30s for real-time updates
      dedupingInterval: 5000, // 5s deduplication
    }
  )

  return {
    rota: data?.rota || null,
    shifts: data?.shifts || [],
    leaves: data?.leaves || [],
    isLoading,
    error,
    mutate,
  }
}
