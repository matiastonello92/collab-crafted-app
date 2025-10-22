-- ============================================
-- FASE 5: MODERATION TOOLS & ANALYTICS
-- ============================================

-- ============================================
-- 1. MODERATION: Post Reports
-- ============================================

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_reported_by ON public.post_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON public.post_reports(created_at DESC);

-- RLS Policies for post_reports
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can report posts if they have posts:view permission
CREATE POLICY "Users can create reports"
ON public.post_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id
      AND (
        p.visibility = 'organization'
        OR (p.visibility = 'location' AND user_in_location(p.location_id))
      )
  )
);

-- Users with posts:moderate can view all reports
CREATE POLICY "Moderators can view reports"
ON public.post_reports
FOR SELECT
USING (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
);

-- Moderators can update report status
CREATE POLICY "Moderators can update reports"
ON public.post_reports
FOR UPDATE
USING (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
);

-- ============================================
-- 2. MODERATION: Hidden Posts
-- ============================================

-- Add is_hidden column to posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON public.posts(is_hidden);

-- Track who hid posts and when
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hidden_by UUID NOT NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  unhidden_by UUID,
  unhidden_at TIMESTAMPTZ,
  UNIQUE(post_id)
);

CREATE INDEX IF NOT EXISTS idx_hidden_posts_post_id ON public.hidden_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_hidden_at ON public.hidden_posts(hidden_at DESC);

-- RLS for hidden_posts
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view hidden posts"
ON public.hidden_posts
FOR SELECT
USING (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
);

CREATE POLICY "Moderators can hide posts"
ON public.hidden_posts
FOR INSERT
WITH CHECK (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
);

CREATE POLICY "Moderators can unhide posts"
ON public.hidden_posts
FOR UPDATE
USING (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
);

-- ============================================
-- 3. ANALYTICS: Post Views & Engagement
-- ============================================

CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share_intent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_user_id ON public.post_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_event_type ON public.post_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_post_analytics_created_at ON public.post_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_created ON public.post_analytics(post_id, created_at DESC);

-- RLS for post_analytics
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Users can track their own views
CREATE POLICY "Users can track views"
ON public.post_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Moderators and post authors can view analytics
CREATE POLICY "Post owners and moderators can view analytics"
ON public.post_analytics
FOR SELECT
USING (
  is_platform_admin()
  OR user_has_permission(auth.uid(), 'posts:moderate')
  OR EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

-- ============================================
-- 4. ANALYTICS: Helper Functions
-- ============================================

-- Function to get post stats
CREATE OR REPLACE FUNCTION public.get_post_stats(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'views', COALESCE((
      SELECT COUNT(DISTINCT user_id) 
      FROM post_analytics 
      WHERE post_id = p_post_id AND event_type = 'view'
    ), 0),
    'unique_views', COALESCE((
      SELECT COUNT(DISTINCT user_id) 
      FROM post_analytics 
      WHERE post_id = p_post_id AND event_type = 'view'
    ), 0),
    'clicks', COALESCE((
      SELECT COUNT(*) 
      FROM post_analytics 
      WHERE post_id = p_post_id AND event_type = 'click'
    ), 0),
    'engagement_rate', CASE
      WHEN (SELECT likes_count + comments_count + shares_count FROM posts WHERE id = p_post_id) > 0
      THEN ROUND(
        (SELECT likes_count + comments_count + shares_count FROM posts WHERE id = p_post_id)::numeric / 
        NULLIF((SELECT COUNT(DISTINCT user_id) FROM post_analytics WHERE post_id = p_post_id AND event_type = 'view'), 0) * 100,
        2
      )
      ELSE 0
    END
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- ============================================
-- 5. ANALYTICS: Materialized View for Trending
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.post_engagement_stats AS
SELECT 
  p.id,
  p.author_id,
  p.org_id,
  p.location_id,
  p.created_at,
  p.likes_count,
  p.comments_count,
  p.shares_count,
  COALESCE((
    SELECT COUNT(DISTINCT user_id) 
    FROM post_analytics pa 
    WHERE pa.post_id = p.id AND pa.event_type = 'view'
  ), 0) AS views_count,
  -- Engagement score: weighted sum of interactions
  (
    p.likes_count * 1 +
    p.comments_count * 3 +
    p.shares_count * 5 +
    COALESCE((
      SELECT COUNT(DISTINCT user_id) 
      FROM post_analytics pa 
      WHERE pa.post_id = p.id AND pa.event_type = 'view'
    ), 0) * 0.1
  ) AS engagement_score,
  -- Time decay factor (posts lose relevance over time)
  EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 AS hours_old
FROM public.posts p
WHERE p.is_hidden = false
  AND p.created_at > now() - INTERVAL '30 days';

-- Indexes for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_engagement_stats_id ON public.post_engagement_stats(id);
CREATE INDEX IF NOT EXISTS idx_post_engagement_stats_score ON public.post_engagement_stats(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_engagement_stats_org ON public.post_engagement_stats(org_id);
CREATE INDEX IF NOT EXISTS idx_post_engagement_stats_location ON public.post_engagement_stats(location_id);

-- Refresh policy: refresh every hour
-- (Manual refresh via API or cron job)

-- ============================================
-- 6. RATE LIMITING: Prevent Report Spam
-- ============================================

CREATE OR REPLACE FUNCTION public.can_report_post(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_reports INT;
BEGIN
  -- Check if user already reported this post
  IF EXISTS (
    SELECT 1 FROM post_reports 
    WHERE reported_by = p_user_id 
      AND post_id = p_post_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Check rate limit: max 10 reports per hour
  SELECT COUNT(*) INTO v_recent_reports
  FROM post_reports
  WHERE reported_by = p_user_id
    AND created_at > now() - INTERVAL '1 hour';
  
  RETURN v_recent_reports < 10;
END;
$$;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Auto-update updated_at on post_reports
CREATE TRIGGER update_post_reports_updated_at
  BEFORE UPDATE ON public.post_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================
-- 8. REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for moderation queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hidden_posts;