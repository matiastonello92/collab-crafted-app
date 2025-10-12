'use client'

import useSWR from 'swr'

interface Shift {
  id: string
  startAt: string
  endAt: string
  breakMinutes: number
  locationId: string
  locationName: string
  status: string
  acceptedAt?: string
  declinedAt?: string
}

interface Leave {
  id: string
  startAt: string
  endAt: string
  status: string
  type: {
    key: string
    label: string
    color: string | null
  }
}

interface EmployeeShiftsResponse {
  shifts: Shift[]
  leaves: Leave[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useEmployeeShifts(userId: string, start: string, end: string) {
  const { data, error, mutate } = useSWR<EmployeeShiftsResponse>(
    userId && start && end 
      ? `/api/v1/employees/${userId}/shifts?start=${start}&end=${end}` 
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    shifts: data?.shifts || [],
    leaves: data?.leaves || [],
    loading: !error && !data,
    error,
    mutate
  }
}
