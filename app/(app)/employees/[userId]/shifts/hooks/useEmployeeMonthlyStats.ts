'use client'

import useSWR from 'swr'

interface MonthlyStats {
  plannedHours: number
  actualHours: number
  variance: number
  overtimeHours: number
  shiftsCount: number
  leaveDays: number
  approvedLeave: number
  pendingLeave: number
}

interface UpcomingShift {
  id: string
  startAt: string
  endAt: string
  breakMinutes: number
  locationName: string
  status: string
}

interface ComplianceAlert {
  id: string
  ruleKey: string
  ruleName: string
  severity: 'warning' | 'critical'
  violationDate: string
  details: any
}

interface EmployeeMonthlyStatsResponse {
  monthlyStats: MonthlyStats
  upcomingShifts: UpcomingShift[]
  complianceAlerts: ComplianceAlert[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useEmployeeMonthlyStats(userId: string, month: string) {
  const { data, error, mutate } = useSWR<EmployeeMonthlyStatsResponse>(
    userId && month ? `/api/v1/employees/${userId}/stats?month=${month}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 min
    }
  )

  return {
    monthlyStats: data?.monthlyStats || null,
    upcomingShifts: data?.upcomingShifts || [],
    complianceAlerts: data?.complianceAlerts || [],
    loading: !error && !data,
    error,
    mutate
  }
}
