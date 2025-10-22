'use client'

import { useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

/**
 * Hook to track post views automatically when post enters viewport
 */
export function usePostAnalytics(postId: string, enabled: boolean = true) {
  const tracked = useRef(false)
  const supabase = createSupabaseBrowserClient()

  const { ref, inView } = useInView({
    threshold: 0.5, // 50% of post visible
    triggerOnce: true, // Only track once per session
  })

  useEffect(() => {
    if (!enabled || !inView || tracked.current) return

    const trackView = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) return

        await fetch(`/api/v1/posts/${postId}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        tracked.current = true
      } catch (error) {
        console.error('Failed to track view:', error)
      }
    }

    trackView()
  }, [inView, postId, enabled, supabase])

  return { ref, inView }
}

/**
 * Hook to fetch post statistics
 */
export function usePostStats(postId: string) {
  const supabase = createSupabaseBrowserClient()

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/v1/posts/${postId}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      return response.json()
    } catch (error) {
      console.error('Failed to fetch post stats:', error)
      return null
    }
  }

  return { fetchStats }
}
