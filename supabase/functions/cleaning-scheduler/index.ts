import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SchedulerResult {
  areas_processed: number;
  tasks_created: number;
  tasks_expired: number;
  execution_time_ms: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🕐 [CLEANING SCHEDULER] Starting automatic task generation...')

    // Call the enterprise-grade SQL function that handles everything
    const { data, error } = await supabase.rpc('ensure_all_cleaning_tasks')

    if (error) {
      console.error('❌ [CLEANING SCHEDULER] Error:', error)
      throw error
    }

    const result = data[0] as SchedulerResult

    console.log(`✅ [CLEANING SCHEDULER] Completed successfully:
  - Areas processed: ${result.areas_processed}
  - Tasks created: ${result.tasks_created}
  - Tasks expired: ${result.tasks_expired}
  - Execution time: ${result.execution_time_ms}ms
`)

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ [CLEANING SCHEDULER] Fatal error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/* 
 * ENTERPRISE CLEANING SCHEDULER
 * 
 * This Edge Function is now a thin wrapper around the ensure_all_cleaning_tasks() SQL function.
 * All business logic is in the database for:
 * - Better performance (no network roundtrips)
 * - Better testability (can run SQL function directly)
 * - Multi-tenant safety (enforced at DB level)
 * - Atomicity (entire operation is transactional)
 * 
 * Automatically called by pg_cron:
 * - Daily at 00:00 UTC (primary run)
 * - Daily at 12:00 UTC (safety net)
 * 
 * Can also be called manually or via HTTP for testing:
 * POST https://project.supabase.co/functions/v1/cleaning-scheduler
 * 
 * Multi-tenant safe: All operations respect org_id and location_id isolation.
 */
