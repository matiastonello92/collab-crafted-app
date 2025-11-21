-- ============================================================
-- ENTERPRISE-GRADE AUTOMATIC CLEANING TASK SCHEDULER
-- ============================================================
-- This migration implements:
-- 1. ensure_all_cleaning_tasks() - Idempotent task generation function
-- 2. pg_cron daily jobs for automatic execution
-- 3. Performance indexes for scalability
-- 4. Multi-tenant safe, location-based isolation
-- ============================================================

-- ============================================================
-- STEP 1: Main Function - ensure_all_cleaning_tasks()
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_all_cleaning_tasks()
RETURNS TABLE(
  areas_processed INTEGER,
  tasks_created INTEGER,
  tasks_expired INTEGER,
  execution_time_ms INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area RECORD;
  v_new_task_id UUID;
  v_tasks_created INTEGER := 0;
  v_areas_processed INTEGER := 0;
  v_tasks_expired INTEGER := 0;
  v_start_time TIMESTAMP;
  v_execution_time_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  RAISE NOTICE '[CLEANING SCHEDULER] Starting at %', v_start_time;
  
  -- Step 1: Close expired tasks first
  BEGIN
    SELECT close_expired_cleaning_tasks() INTO v_tasks_expired;
    RAISE NOTICE '[CLEANING SCHEDULER] Closed % expired tasks', v_tasks_expired;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[CLEANING SCHEDULER] Error closing expired tasks: %', SQLERRM;
    v_tasks_expired := 0;
  END;
  
  -- Step 2: Ensure each active area has a pending task
  FOR v_area IN 
    SELECT 
      ca.id, 
      ca.org_id, 
      ca.location_id, 
      ca.name, 
      ca.cleaning_frequency
    FROM haccp_cleaning_areas ca
    WHERE ca.is_active = true
    ORDER BY ca.org_id, ca.location_id, ca.id
  LOOP
    v_areas_processed := v_areas_processed + 1;
    
    -- Check if area already has a pending/overdue task
    IF NOT EXISTS (
      SELECT 1 
      FROM haccp_cleaning_completions cc
      WHERE cc.area_id = v_area.id
        AND cc.org_id = v_area.org_id           -- Multi-tenant isolation
        AND cc.location_id = v_area.location_id -- Location-based isolation
        AND cc.status IN ('pending', 'overdue')
      LIMIT 1
    ) THEN
      -- Generate new task
      BEGIN
        v_new_task_id := generate_next_cleaning_task(v_area.id);
        
        IF v_new_task_id IS NOT NULL THEN
          v_tasks_created := v_tasks_created + 1;
          RAISE NOTICE '[CLEANING SCHEDULER] Created task for area "%" (org: %, loc: %)', 
            v_area.name, v_area.org_id, v_area.location_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[CLEANING SCHEDULER] Error creating task for area %: %', 
          v_area.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  v_execution_time_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
  
  RAISE NOTICE '[CLEANING SCHEDULER] Completed in %ms - Processed: %, Created: %, Expired: %', 
    v_execution_time_ms, v_areas_processed, v_tasks_created, v_tasks_expired;
  
  RETURN QUERY SELECT v_areas_processed, v_tasks_created, v_tasks_expired, v_execution_time_ms;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_all_cleaning_tasks() TO authenticated, service_role;

COMMENT ON FUNCTION public.ensure_all_cleaning_tasks() IS 
'Enterprise-grade automatic cleaning task scheduler. Ensures every active cleaning area has a pending task. Multi-tenant safe, idempotent, and performant.';

-- ============================================================
-- STEP 2: Performance Indexes
-- ============================================================

-- Index for checking existing pending/overdue tasks per area
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_area_status_tenant 
  ON haccp_cleaning_completions(area_id, org_id, location_id, status) 
  WHERE status IN ('pending', 'overdue');

-- Index for active areas lookup
CREATE INDEX IF NOT EXISTS idx_cleaning_areas_active_tenant
  ON haccp_cleaning_areas(org_id, location_id, is_active)
  WHERE is_active = true;

-- Index for deadline-based queries
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_deadline
  ON haccp_cleaning_completions(deadline_at, status)
  WHERE status IN ('pending', 'overdue') AND deadline_at IS NOT NULL;

-- Index for scheduled_for date queries (for history/today views)
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_scheduled_date
  ON haccp_cleaning_completions(location_id, scheduled_for, status);

-- ============================================================
-- STEP 3: pg_cron Configuration
-- ============================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing scheduling jobs to avoid duplicates
SELECT cron.unschedule('cleaning-auto-scheduler') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleaning-auto-scheduler');
SELECT cron.unschedule('cleaning-auto-scheduler-noon') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleaning-auto-scheduler-noon');

-- Schedule primary job: Daily at 00:00 UTC
SELECT cron.schedule(
  'cleaning-auto-scheduler',
  '0 0 * * *',
  'SELECT public.ensure_all_cleaning_tasks();'
);

-- Schedule secondary job: Daily at 12:00 UTC (safety net)
SELECT cron.schedule(
  'cleaning-auto-scheduler-noon',
  '0 12 * * *',
  'SELECT public.ensure_all_cleaning_tasks();'
);

-- ============================================================
-- STEP 4: Monitoring & Statistics Views
-- ============================================================

-- View for real-time task statistics per location
CREATE OR REPLACE VIEW public.cleaning_tasks_stats AS
SELECT 
  ca.org_id,
  ca.location_id,
  COUNT(DISTINCT ca.id) as total_active_areas,
  COUNT(DISTINCT CASE WHEN cc.status = 'pending' THEN cc.id END) as pending_tasks,
  COUNT(DISTINCT CASE WHEN cc.status = 'overdue' THEN cc.id END) as overdue_tasks,
  COUNT(DISTINCT CASE WHEN cc.status = 'completed' AND cc.scheduled_for::date = CURRENT_DATE THEN cc.id END) as completed_today,
  MAX(cc.created_at) as last_task_created_at
FROM haccp_cleaning_areas ca
LEFT JOIN haccp_cleaning_completions cc ON cc.area_id = ca.id 
  AND cc.org_id = ca.org_id
  AND cc.location_id = ca.location_id
WHERE ca.is_active = true
GROUP BY ca.org_id, ca.location_id
ORDER BY ca.org_id, ca.location_id;

GRANT SELECT ON public.cleaning_tasks_stats TO authenticated;

COMMENT ON VIEW public.cleaning_tasks_stats IS 
'Real-time statistics for cleaning tasks per organization and location. Useful for monitoring and dashboards.';