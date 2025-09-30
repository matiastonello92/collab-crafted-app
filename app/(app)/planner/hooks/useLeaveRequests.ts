'use client'

import useSWR from 'swr'
import type { LeaveRequest } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface LeaveRequestWithType extends LeaveRequest {
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
  }
}

export function useLeaveRequests(locationId: string | null, weekStart: string) {
  const { data, error, mutate } = useSWR<{ requests: LeaveRequestWithType[] }>(
    locationId && weekStart
      ? `/api/v1/leave/requests?location_id=${locationId}&week_start=${weekStart}&status=approved`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min
    }
  )

  return {
    leaves: data?.requests || [],
    loading: !error && !data,
    error,
    mutate
  }
}
