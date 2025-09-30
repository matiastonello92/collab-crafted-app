'use client'

import useSWR from 'swr'
import type { LeaveRequest } from '@/types/shifts'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useMyLeaveRequests() {
  const { data, error, mutate } = useSWR<{ requests: LeaveRequest[] }>(
    '/api/v1/leave/requests',
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
