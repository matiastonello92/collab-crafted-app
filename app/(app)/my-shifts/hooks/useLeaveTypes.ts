'use client'

import useSWR from 'swr'

export interface LeaveType {
  id: string
  key: string
  label: string
  color: string
  requires_approval: boolean
  is_active: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useLeaveTypes() {
  const { data, error, mutate } = useSWR<{ leaveTypes: LeaveType[] }>(
    '/api/v1/leave/types',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    leaveTypes: data?.leaveTypes || [],
    loading: !error && !data,
    error,
    mutate
  }
}
