'use client'

import useSWR from 'swr'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

interface User {
  id: string
  full_name: string
  avatar_url?: string
  org_id: string
}

interface SearchResponse {
  users: User[]
  total: number
}

const fetcher = async (url: string): Promise<SearchResponse> => {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}

/**
 * Hook for mention suggestions with SWR caching
 * Searches users in the same organization
 */
export function useMentionSuggestions(query: string, locationId?: string) {
  const shouldFetch = query.length >= 2
  
  const params = new URLSearchParams()
  params.set('q', query)
  if (locationId) {
    params.set('locationId', locationId)
  }

  const key = shouldFetch ? `/api/v1/users/search?${params.toString()}` : null

  const { data, error, isLoading } = useSWR<SearchResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10s cache
      errorRetryCount: 2,
      keepPreviousData: true,
    }
  )

  return {
    users: data?.users || [],
    total: data?.total || 0,
    isLoading: shouldFetch && isLoading,
    error,
  }
}
