'use client'

import useSWR from 'swr'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
import { usePermissions, hasPermission } from '@/hooks/usePermissions'
import type { Post } from './useInfiniteFeed'

interface TrendingResponse {
  posts: Post[]
  total: number
}

const fetcher = async (url: string): Promise<TrendingResponse> => {
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
    throw new Error('Failed to fetch trending posts')
  }

  return response.json()
}

export function useTrendingPosts(locationId?: string, limit: number = 10) {
  const { permissions } = usePermissions(locationId)
  const canView = hasPermission(permissions, 'posts:view')

  const params = new URLSearchParams()
  if (locationId) params.set('locationId', locationId)
  params.set('limit', limit.toString())

  const { data, error, isLoading, mutate } = useSWR<TrendingResponse>(
    canView ? `/api/v1/posts/trending?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5min cache for trending
    }
  )

  return {
    posts: data?.posts || [],
    total: data?.total || 0,
    isLoading,
    error,
    canView,
    mutate,
  }
}
