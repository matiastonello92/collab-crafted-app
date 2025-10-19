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
  profiles?: {
    id: string
    full_name: string
  }
}

export function useUserLeaveRequests(userId: string | null, status?: string) {
  const statusParam = status && status !== 'all' ? `&status=${status}` : ''
  
  const { data, error, mutate } = useSWR<{ requests: LeaveRequestWithType[] }>(
    userId ? `/api/v1/admin/users/${userId}/leave-requests?${statusParam}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    requests: data?.requests || [],
    loading: !error && !data,
    error,
    mutate
  }
}
