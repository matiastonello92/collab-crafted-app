import { useEffect } from 'react'
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
      refreshInterval: 10000, // Poll every 10s for faster updates
      dedupingInterval: 2000, // 2s deduplication
    }
  )
  
  // Listen for shift updates from kiosk
  useEffect(() => {
    const handleShiftUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.locationId === locationId) {
        console.log('[Planner] Force refresh due to kiosk punch:', customEvent.detail)
        mutate() // Force immediate refresh
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('shift-updated', handleShiftUpdate)
      return () => window.removeEventListener('shift-updated', handleShiftUpdate)
    }
  }, [locationId, mutate])

  return {
    rota: data?.rota || null,
    shifts: data?.shifts || [],
    leaves: data?.leaves || [],
    isLoading,
    error,
    mutate,
  }
}
