-- Sprint 10: Search Analytics Table
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL,
  location_id UUID,
  results_count INTEGER NOT NULL DEFAULT 0,
  selected_result_id TEXT,
  selected_result_type TEXT,
  command_mode BOOLEAN DEFAULT false,
  filters_applied JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_search_analytics_user ON public.search_analytics(user_id);
CREATE INDEX idx_search_analytics_org ON public.search_analytics(org_id);
CREATE INDEX idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX idx_search_analytics_created ON public.search_analytics(created_at DESC);

-- RLS policies
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Admins can see all analytics for their org
CREATE POLICY "search_analytics_select_admin" ON public.search_analytics
  FOR SELECT
  USING (
    is_platform_admin() 
    OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'view_settings'))
  );

-- Users can insert their own analytics
CREATE POLICY "search_analytics_insert_self" ON public.search_analytics
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND user_in_org(org_id));

-- Comment
COMMENT ON TABLE public.search_analytics IS 'Sprint 10: Tracks search queries and user interactions for analytics and optimization';