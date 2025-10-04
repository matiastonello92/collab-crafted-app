-- =====================================================
-- P0 - TELEMETRY: Recipe Usage Logs & Stats
-- =====================================================

-- 1. Create recipe_usage_logs table
CREATE TABLE IF NOT EXISTS public.recipe_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('cook_mode_opened', 'recipe_printed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_usage_logs_recipe ON public.recipe_usage_logs(recipe_id, created_at DESC);
CREATE INDEX idx_usage_logs_user ON public.recipe_usage_logs(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.recipe_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_logs_insert_own"
  ON public.recipe_usage_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND user_in_org(org_id) AND user_in_location(location_id));

CREATE POLICY "usage_logs_select_by_org"
  ON public.recipe_usage_logs
  FOR SELECT
  USING (is_platform_admin() OR user_in_org(org_id));

-- 2. Create materialized view for aggregated stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.recipe_usage_stats AS
SELECT 
  recipe_id,
  COUNT(*) FILTER (WHERE event_type = 'cook_mode_opened') AS cook_count,
  COUNT(*) FILTER (WHERE event_type = 'recipe_printed') AS print_count,
  COUNT(*) AS total_uses,
  MAX(created_at) FILTER (WHERE event_type = 'cook_mode_opened') AS last_cooked_at,
  MAX(created_at) FILTER (WHERE event_type = 'recipe_printed') AS last_printed_at,
  MAX(created_at) AS last_used_at
FROM public.recipe_usage_logs
GROUP BY recipe_id;

-- Index for fast joins
CREATE UNIQUE INDEX idx_usage_stats_recipe ON public.recipe_usage_stats(recipe_id);

-- Refresh function (chiamare periodicamente o on-demand)
CREATE OR REPLACE FUNCTION public.refresh_recipe_usage_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.recipe_usage_stats;
END;
$$;

-- Trigger per refresh automatico (ogni 100 nuovi log)
CREATE OR REPLACE FUNCTION public.trigger_refresh_usage_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_count INTEGER;
BEGIN
  -- Conta i log dalla last refresh (approssimazione)
  SELECT COUNT(*) INTO log_count
  FROM public.recipe_usage_logs
  WHERE created_at > (
    SELECT COALESCE(MAX(last_used_at), now() - interval '1 hour')
    FROM public.recipe_usage_stats
  );
  
  -- Refresh ogni 100 log
  IF log_count >= 100 THEN
    PERFORM public.refresh_recipe_usage_stats();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_refresh_stats_on_insert
AFTER INSERT ON public.recipe_usage_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_usage_stats();

-- Initial refresh
REFRESH MATERIALIZED VIEW public.recipe_usage_stats;