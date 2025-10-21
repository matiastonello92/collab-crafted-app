'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface LeaveRequestWithType {
  id: string
  org_id: string
  location_id: string
  user_id: string
  type_id: string
  start_at: string
  end_at: string
  reason: string | null
  status: string
  approver_id: string | null
  approved_at: string | null
  notes: string | null
  converted_to_leave_id: string | null
  created_at: string
  updated_at: string
  leave_types: {
    id: string
    key: string
    label: string
    color: string | null
    requires_approval: boolean
  }
  approver?: {
    full_name: string
  } | null
}

export function useUserLeaveRequests(userId: string, status?: string) {
  const queryParams = new URLSearchParams()
  if (status && status !== 'all') {
    queryParams.append('status', status)
  }
  
  const url = `/api/v1/admin/leave/user/${userId}?${queryParams.toString()}`
  
  const { data, error, mutate } = useSWR<{ requests: LeaveRequestWithType[] }>(
    userId ? url : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return {
    leaveRequests: data?.requests || [],
    loading: !error && !data,
    error,
    mutate
  }
}
