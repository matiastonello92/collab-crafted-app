'use client'

import { createSupabaseBrowserClient } from '@/utils/supabase/client'

interface TrackSearchParams {
  query: string
  orgId: string
  locationId: string | null
  resultsCount: number
  selectedResultId?: string
  selectedResultType?: string
  commandMode?: boolean
  filtersApplied?: Record<string, any>
}

export function useSearchAnalytics() {
  const trackSearch = async (params: TrackSearchParams) => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('search_analytics').insert({
        query: params.query,
        user_id: user.id,
        org_id: params.orgId,
        location_id: params.locationId,
        results_count: params.resultsCount,
        selected_result_id: params.selectedResultId,
        selected_result_type: params.selectedResultType,
        command_mode: params.commandMode || false,
        filters_applied: params.filtersApplied || {},
      })
    } catch (error) {
      // Silent fail - analytics should not block user experience
      console.debug('Search analytics tracking failed:', error)
    }
  }

  return { trackSearch }
}
