import { NextResponse } from 'next/server'
import { getSupabaseServiceRoleKey } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Basic health info
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }

    // Supabase configuration check
    let serviceRolePresent = true
    try {
      getSupabaseServiceRoleKey()
    } catch {
      serviceRolePresent = false
    }

    const supabase = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not_set',
      anon_key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      service_role_present: serviceRolePresent
    }

    // Environment variables check (NEXT_PUBLIC_* only, for security)
    const envVars = []
    
    // Check important NEXT_PUBLIC environment variables
    const publicEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'NEXT_PUBLIC_SITE_URL'
    ]

    for (const envVar of publicEnvVars) {
      const value = process.env[envVar]
      envVars.push({
        name: envVar,
        present: !!value,
        masked_value: value 
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : undefined
      })
    }

    return NextResponse.json({
      ...health,
      supabase,
      env_vars: envVars
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'development'
    }, { status: 500 })
  }
}
