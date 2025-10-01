'use client'

import { useState, useCallback } from 'react'

interface RotaCheckResult {
  exists: boolean
  rota: {
    id: string
    status: string
    week_start_date: string
  } | null
}

export function useRotaCheck() {
  const [checking, setChecking] = useState(false)

  const checkRota = useCallback(
    async (locationId: string, weekStartDate: string): Promise<RotaCheckResult | null> => {
      setChecking(true)
      try {
        const res = await fetch(
          `/api/v1/rotas/check?location_id=${locationId}&week_start_date=${weekStartDate}`
        )
        if (!res.ok) throw new Error('Failed to check rota')
        const data = await res.json()
        return data
      } catch (error) {
        console.error('Error checking rota:', error)
        return null
      } finally {
        setChecking(false)
      }
    },
    []
  )

  return { checkRota, checking }
}
