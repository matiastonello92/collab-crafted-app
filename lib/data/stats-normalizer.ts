'use client'

import { DataTransformationLayer, DashboardStats, PlatformStats } from './transformers'

interface StatsEndpoint {
  url: string
  type: 'platform' | 'admin' | 'health'
  priority: number // Lower number = higher priority
}

interface NormalizedDashboard {
  stats: DashboardStats
  metadata: {
    sources: string[]
    lastUpdate: Date
    confidence: number // 0-1 based on data quality
  }
}

export class StatsNormalizer {
  private static readonly ENDPOINTS: StatsEndpoint[] = [
    { url: '/api/platform/dashboard', type: 'platform', priority: 1 },
    { url: '/api/v1/admin/dashboard', type: 'admin', priority: 2 },
    { url: '/api/health', type: 'health', priority: 3 }
  ]

  private static cache = new Map<string, { data: NormalizedDashboard; expiry: number }>()
  private static readonly CACHE_TTL = 60000 // 1 minute

  static async normalizeStats(): Promise<NormalizedDashboard> {
    const cacheKey = 'normalized-stats'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    // Fetch from all available endpoints
    const statsPromises = this.ENDPOINTS.map(endpoint => 
      this.fetchStatsWithFallback(endpoint)
    )

    const results = await Promise.allSettled(statsPromises)
    const successfulSources: string[] = []
    const statsData: Array<{ data: any; priority: number; source: string }> = []

    // Collect successful responses
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const endpoint = this.ENDPOINTS[i]
      
      if (result.status === 'fulfilled' && result.value) {
        successfulSources.push(endpoint.url)
        statsData.push({
          data: result.value,
          priority: endpoint.priority,
          source: endpoint.type
        })
      }
    }

    // Sort by priority (lower number = higher priority)
    statsData.sort((a, b) => a.priority - b.priority)

    // Normalize stats with fallback chain
    const normalizedStats = this.mergeStatsData(statsData)
    
    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(successfulSources, statsData)

    const result: NormalizedDashboard = {
      stats: normalizedStats,
      metadata: {
        sources: successfulSources,
        lastUpdate: new Date(),
        confidence
      }
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.CACHE_TTL
    })

    return result
  }

  private static async fetchStatsWithFallback(endpoint: StatsEndpoint): Promise<unknown | null> {
    try {
      const response = await fetch(endpoint.url, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()

    } catch (error) {
      console.warn(`[StatsNormalizer] Failed to fetch ${endpoint.url}:`, 
        error instanceof Error ? error.message : error)
      return null
    }
  }

  private static mergeStatsData(statsData: Array<{ data: any; priority: number; source: string }>): DashboardStats {
    let mergedStats: DashboardStats = {
      activeUsers: 0,
      locations: 0,
      featureFlags: 0,
      permissions: 0
    }

    for (const { data, source } of statsData) {
      try {
        let normalizedData: DashboardStats

        switch (source) {
          case 'platform':
            normalizedData = DataTransformationLayer.transformPlatformStats(data)
            break
          case 'admin':
            normalizedData = this.transformAdminStats(data)
            break
          case 'health':
            normalizedData = this.transformHealthStats(data)
            break
          default:
            continue
        }

        // Merge with priority - first successful source wins for each field
        if (mergedStats.activeUsers === 0 && normalizedData.activeUsers > 0) {
          mergedStats.activeUsers = normalizedData.activeUsers
        }
        if (mergedStats.locations === 0 && normalizedData.locations > 0) {
          mergedStats.locations = normalizedData.locations
        }
        if (mergedStats.featureFlags === 0 && normalizedData.featureFlags > 0) {
          mergedStats.featureFlags = normalizedData.featureFlags
        }
        if (mergedStats.permissions === 0 && normalizedData.permissions > 0) {
          mergedStats.permissions = normalizedData.permissions
        }

      } catch (error) {
        console.warn(`[StatsNormalizer] Failed to normalize ${source} data:`, error)
        continue
      }
    }

    return mergedStats
  }

  private static transformAdminStats(data: any): DashboardStats {
    return {
      activeUsers: data?.tenant?.users_total || 0,
      locations: data?.tenant?.locations_total || 0,
      featureFlags: data?.tenant?.invites_pending || 0, // Fallback mapping
      permissions: data?.security?.audit_recent?.length || 0
    }
  }

  private static transformHealthStats(data: any): DashboardStats {
    // Health endpoint provides minimal stats - use as last resort
    return {
      activeUsers: data?.env_vars?.length || 0, // Very rough estimate
      locations: 1, // Assume at least one location if health is responding
      featureFlags: 0,
      permissions: 0
    }
  }

  private static calculateConfidence(sources: string[], statsData: Array<{ data: any; source: string }>): number {
    // Base confidence on number of successful sources and data quality
    const sourceWeight = Math.min(sources.length / this.ENDPOINTS.length, 1)
    
    // Data quality weight - check if we have meaningful data
    const hasValidData = statsData.some(({ data, source }) => {
      if (source === 'platform') {
        return data?.tenant?.total_users > 0 || data?.tenant?.total_locations > 0
      }
      if (source === 'admin') {
        return data?.tenant?.users_total > 0 || data?.tenant?.locations_total > 0
      }
      return false
    })
    
    const dataQualityWeight = hasValidData ? 1 : 0.3
    
    return Math.round((sourceWeight * 0.6 + dataQualityWeight * 0.4) * 100) / 100
  }

  // Force refresh cache
  static invalidateCache(): void {
    this.cache.clear()
  }

  // Get cached stats without making new requests
  static getCachedStats(): NormalizedDashboard | null {
    const cached = this.cache.get('normalized-stats')
    return cached && Date.now() < cached.expiry ? cached.data : null
  }
}