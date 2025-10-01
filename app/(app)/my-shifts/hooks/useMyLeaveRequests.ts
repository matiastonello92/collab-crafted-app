'use client'

import useSWR from 'swr'
import { useAppStore } from '@/lib/store/unified'
import type { LeaveRequest } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyLeaveRequests() {
  const hasHydrated = useAppStore(state => state.hasHydrated)
  const orgId = useAppStore(state => state.context.org_id)
  
  const { data, error, mutate } = useSWR<{ requests: LeaveRequest[] }>(
    hasHydrated && orgId ? '/api/v1/leave/requests' : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    leaveRequests: data?.requests || [],
    loading: !error && !data,
    error,
    mutate
  }
}
