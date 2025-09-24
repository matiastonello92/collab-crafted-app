'use client'

import { DataTransformationLayer, ServiceHealth } from './transformers'

interface HealthEndpoint {
  url: string
  timeout: number
  retryAttempts: number
}

interface AggregatedHealth {
  services: ServiceHealth[]
  overallStatus: 'operational' | 'warning' | 'error'
  lastCheck: Date
  metadata: {
    endpoints: string[]
    failedEndpoints: string[]
    responseTime: number
  }
}

export class ServiceHealthAggregator {
  private static readonly ENDPOINTS: HealthEndpoint[] = [
    { url: '/api/health', timeout: 5000, retryAttempts: 2 },
    { url: '/api/healthz', timeout: 3000, retryAttempts: 1 }
  ]

  private static cache = new Map<string, { data: AggregatedHealth; expiry: number }>()
  private static readonly CACHE_TTL = 30000 // 30 seconds

  static async aggregateHealth(): Promise<AggregatedHealth> {
    const cacheKey = 'health-aggregate'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    const startTime = performance.now()
    const healthPromises = this.ENDPOINTS.map(endpoint => 
      this.fetchHealthWithRetry(endpoint)
    )

    const results = await Promise.allSettled(healthPromises)
    const responseTime = performance.now() - startTime

    const services: ServiceHealth[] = []
    const successfulEndpoints: string[] = []
    const failedEndpoints: string[] = []

    // Process results from all endpoints
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const endpoint = this.ENDPOINTS[i]
      
      if (result.status === 'fulfilled' && result.value) {
        successfulEndpoints.push(endpoint.url)
        const transformedServices = DataTransformationLayer.transformHealthToServices(result.value)
        
        // Merge services, avoiding duplicates
        transformedServices.forEach(service => {
          const existing = services.find(s => s.service === service.service)
          if (!existing) {
            services.push(service)
          } else if (service.status === 'error' || (service.status === 'warning' && existing.status === 'operational')) {
            // Prioritize error/warning states
            Object.assign(existing, service)
          }
        })
      } else {
        failedEndpoints.push(endpoint.url)
      }
    }

    // Add synthetic services if no health data available
    if (services.length === 0) {
      services.push({
        service: 'System',
        status: 'error',
        message: 'All health endpoints failed'
      })
    }

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(services)

    const aggregatedHealth: AggregatedHealth = {
      services,
      overallStatus,
      lastCheck: new Date(),
      metadata: {
        endpoints: this.ENDPOINTS.map(e => e.url),
        failedEndpoints,
        responseTime
      }
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: aggregatedHealth,
      expiry: Date.now() + this.CACHE_TTL
    })

    return aggregatedHealth
  }

  private static async fetchHealthWithRetry(endpoint: HealthEndpoint): Promise<unknown | null> {
    for (let attempt = 0; attempt <= endpoint.retryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout)

        const response = await fetch(endpoint.url, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return await response.json()

      } catch (error) {
        console.warn(`[HealthAggregator] Attempt ${attempt + 1}/${endpoint.retryAttempts + 1} failed for ${endpoint.url}:`, 
          error instanceof Error ? error.message : error)
        
        if (attempt === endpoint.retryAttempts) {
          return null
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
    
    return null
  }

  private static calculateOverallStatus(services: ServiceHealth[]): 'operational' | 'warning' | 'error' {
    if (services.some(s => s.status === 'error')) {
      return 'error'
    }
    if (services.some(s => s.status === 'warning')) {
      return 'warning'
    }
    return 'operational'
  }

  // Force refresh cache
  static invalidateCache(): void {
    this.cache.clear()
  }

  // Get cached health without making new requests
  static getCachedHealth(): AggregatedHealth | null {
    const cached = this.cache.get('health-aggregate')
    return cached && Date.now() < cached.expiry ? cached.data : null
  }
}