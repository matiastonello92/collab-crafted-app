'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function useNotifications() {
  const { data, error, mutate } = useSWR(
    '/api/v1/me/notifications',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000
    }
  )

  return {
    count: data?.count || 0,
    notifications: data?.notifications || [],
    loading: !error && !data,
    error,
    mutate
  }
}
