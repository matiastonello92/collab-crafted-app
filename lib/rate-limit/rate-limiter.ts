import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RateLimitConfig {
  max: number // Max requests
  window: number // Window in seconds
  keyPrefix: string // Unique key for endpoint
}

export async function checkRateLimit(
  userId: string | null,
  ip: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `${config.keyPrefix}:${userId || ip}`
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.window * 1000)

  // Get current hits in window
  const { data: existing } = await supabase
    .from('api_rate_limits')
    .select('hits, window_start')
    .eq('user_id', userId)
    .eq('key', key)
    .gte('window_start', windowStart.toISOString())
    .single()

  if (!existing) {
    // First request in window
    await supabase.from('api_rate_limits').insert({
      user_id: userId,
      key,
      hits: 1,
      window_start: now.toISOString(),
    })

    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: new Date(now.getTime() + config.window * 1000),
    }
  }

  if (existing.hits >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(
        new Date(existing.window_start).getTime() + config.window * 1000
      ),
    }
  }

  // Increment hits
  await supabase
    .from('api_rate_limits')
    .update({ hits: existing.hits + 1 })
    .eq('user_id', userId)
    .eq('key', key)

  return {
    allowed: true,
    remaining: config.max - existing.hits - 1,
    resetAt: new Date(
      new Date(existing.window_start).getTime() + config.window * 1000
    ),
  }
}

export function withRateLimit(config: RateLimitConfig) {
  return function (
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest) => {
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const authHeader = request.headers.get('authorization')
      
      // Extract user ID from JWT (simplified)
      let userId: string | null = null
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const payload = JSON.parse(atob(token.split('.')[1]))
          userId = payload.sub
        } catch {
          // Invalid token, use IP only
        }
      }

      const { allowed, remaining, resetAt } = await checkRateLimit(
        userId,
        ip,
        config
      )

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            resetAt: resetAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetAt.toISOString(),
            },
          }
        )
      }

      const response = await handler(request)
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', config.max.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetAt.toISOString())

      return response
    }
  }
}
