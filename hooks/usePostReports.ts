'use client'

import useSWR from 'swr'
import { usePermissions, hasPermission } from '@/hooks/usePermissions'

export interface PostReport {
  id: string
  post_id: string
  reported_by: string
  reason: string
  details?: string
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'
  reviewed_by?: string
  reviewed_at?: string
  reviewer_notes?: string
  created_at: string
  updated_at: string
  post?: {
    id: string
    content: string
    author: {
      id: string
      full_name: string
      avatar_url?: string
    }
  }
  reporter?: {
    id: string
    full_name: string
  }
}

interface ReportsResponse {
  reports: PostReport[]
  total: number
}

const fetcher = async (url: string): Promise<ReportsResponse> => {
  const response = await fetch(url, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch reports')
  }

  return response.json()
}

export function usePostReports(status?: 'pending' | 'reviewed' | 'dismissed' | 'actioned') {
  const { permissions } = usePermissions()
  const canModerate = hasPermission(permissions, 'posts:moderate')

  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const { data, error, isLoading, mutate } = useSWR<ReportsResponse>(
    canModerate ? `/api/v1/posts/reports?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30s cache
    }
  )

  const reportPost = async (postId: string, reason: string, details?: string) => {
    const response = await fetch(`/api/v1/posts/${postId}/report`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, details }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to report post')
    }

    return response.json()
  }

  const reviewReport = async (reportId: string, status: 'reviewed' | 'dismissed' | 'actioned', notes?: string) => {
    const response = await fetch(`/api/v1/posts/reports/${reportId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, notes }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to review report')
    }

    // Revalidate reports list
    await mutate()

    return response.json()
  }

  return {
    reports: data?.reports || [],
    total: data?.total || 0,
    isLoading,
    error,
    canModerate,
    reportPost,
    reviewReport,
    mutate,
  }
}
