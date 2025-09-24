'use client'

import { z } from 'zod'

// Zod Schemas per Type Safety & Runtime Validation
export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().optional(),
  environment: z.string().optional(),
  version: z.string().optional(),
  supabase: z.object({
    url: z.string(),
    anon_key_present: z.boolean(),
    service_role_present: z.boolean()
  }).optional(),
  env_vars: z.array(z.object({
    name: z.string(),
    present: z.boolean(),
    masked_value: z.string().optional()
  })).optional(),
  db: z.object({
    status: z.string(),
    error: z.string().optional()
  }).optional()
})

export const PlatformStatsSchema = z.object({
  tenant: z.object({
    total_orgs: z.number().default(0),
    total_users: z.number().default(0),
    active_users_30d: z.number().default(0),
    total_locations: z.number().default(0),
    pending_invites: z.number().default(0)
  }).default({
    total_orgs: 0,
    total_users: 0,
    active_users_30d: 0,
    total_locations: 0,
    pending_invites: 0
  }),
  security: z.object({
    audit_recent: z.array(z.any()).default([])
  }).default({
    audit_recent: []
  }),
  ops: z.object({
    health: z.object({
      status: z.string().default('unknown')
    }).default({
      status: 'unknown'
    })
  }).default({
    health: { status: 'unknown' }
  }),
  plans: z.object({
    plans_by_tier: z.record(z.string(), z.number()).default({})
  }).default({
    plans_by_tier: {}
  })
})

export const ServiceHealthSchema = z.object({
  service: z.string(),
  status: z.enum(['operational', 'warning', 'error']),
  message: z.string(),
  details: z.any().optional()
})

export const DashboardStatsSchema = z.object({
  activeUsers: z.number().default(0),
  locations: z.number().default(0),
  featureFlags: z.number().default(0),
  permissions: z.number().default(0)
})

// Type definitions
export type HealthResponse = z.infer<typeof HealthResponseSchema>
export type PlatformStats = z.infer<typeof PlatformStatsSchema>
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>
export type DashboardStats = z.infer<typeof DashboardStatsSchema>

// Transformation Functions with Error Handling
export class DataTransformationLayer {
  private static logTransformationError(operation: string, data: any, error: any) {
    console.warn(`[DTL] Transformation failed for ${operation}:`, {
      data: typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : data,
      error: error instanceof Error ? error.message : error
    })
  }

  static transformHealthToServices(healthData: unknown): ServiceHealth[] {
    try {
      const parsed = HealthResponseSchema.safeParse(healthData)
      
      if (!parsed.success) {
        this.logTransformationError('health-to-services', healthData, parsed.error)
        return this.getFallbackServices()
      }

      const health = parsed.data
      const services: ServiceHealth[] = []

      // Main API Health
      services.push({
        service: 'API',
        status: health.status === 'healthy' ? 'operational' : 'error',
        message: health.status === 'healthy' ? 'Healthy' : `Status: ${health.status}`,
        details: { environment: health.environment, version: health.version }
      })

      // Database Health (from healthz endpoint)
      if (health.db) {
        services.push({
          service: 'Database',
          status: health.db.status === 'ok' ? 'operational' : 'error',
          message: health.db.status === 'ok' ? 'Connected' : health.db.error || 'Connection failed',
          details: health.db
        })
      }

      // Supabase Configuration
      if (health.supabase) {
        const supabaseHealthy = health.supabase.anon_key_present && health.supabase.service_role_present
        services.push({
          service: 'Supabase',
          status: supabaseHealthy ? 'operational' : 'warning',
          message: supabaseHealthy ? 'Configured' : 'Missing keys',
          details: health.supabase
        })
      }

      // Environment Variables Check
      if (health.env_vars) {
        const missingEnvs = health.env_vars.filter(env => !env.present)
        services.push({
          service: 'Environment',
          status: missingEnvs.length === 0 ? 'operational' : 'warning',
          message: missingEnvs.length === 0 ? 'All variables set' : `${missingEnvs.length} missing`,
          details: { missing: missingEnvs.map(env => env.name) }
        })
      }

      return services.length > 0 ? services : this.getFallbackServices()

    } catch (error) {
      this.logTransformationError('health-to-services', healthData, error)
      return this.getFallbackServices()
    }
  }

  static transformPlatformStats(statsData: unknown): DashboardStats {
    try {
      const parsed = PlatformStatsSchema.safeParse(statsData)
      
      if (!parsed.success) {
        this.logTransformationError('platform-stats', statsData, parsed.error)
        return this.getFallbackStats()
      }

      const stats = parsed.data
      
      return {
        activeUsers: stats.tenant.active_users_30d || stats.tenant.total_users || 0,
        locations: stats.tenant.total_locations || 0,
        featureFlags: Object.keys(stats.plans.plans_by_tier).length || 0,
        permissions: stats.security.audit_recent.length || 0
      }

    } catch (error) {
      this.logTransformationError('platform-stats', statsData, error)
      return this.getFallbackStats()
    }
  }

  private static getFallbackServices(): ServiceHealth[] {
    return [
      {
        service: 'System',
        status: 'warning',
        message: 'Health check unavailable'
      }
    ]
  }

  private static getFallbackStats(): DashboardStats {
    return {
      activeUsers: 0,
      locations: 0,
      featureFlags: 0,
      permissions: 0
    }
  }

  // Utility for graceful degradation
  static safeTransform<T>(
    data: unknown,
    transformer: (data: unknown) => T,
    fallback: T,
    operation: string
  ): T {
    try {
      return transformer(data)
    } catch (error) {
      this.logTransformationError(operation, data, error)
      return fallback
    }
  }
}