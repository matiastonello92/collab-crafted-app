'use client'

import useSWR from 'swr'

export interface SearchResult {
  id: string;
  type: 'user' | 'shift' | 'recipe' | 'inventory' | 'financial' | 'location' | 'navigation';
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  score?: number;
  metadata?: Record<string, any>;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number;
}

const fetcher = async (url: string): Promise<SearchResponse> => {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Search failed')
  }
  return response.json()
}

/**
 * Search cache hook with SWR
 * Implements 5-minute caching aligned with permissions cache
 */
export function useSearchCache(query: string, enabled: boolean = true) {
  const key = enabled && query.length >= 2 
    ? `/api/v1/search/global?q=${encodeURIComponent(query)}`
    : null
  
  const { data, error, isLoading, mutate } = useSWR<SearchResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5min cache (aligned with permissions)
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      keepPreviousData: true,
    }
  )

  return {
    results: data?.results || [],
    total: data?.total || 0,
    took: data?.took || 0,
    isLoading: enabled && isLoading,
    error,
    mutate,
  }
}
