-- =====================================================
-- HACCP Cleaning Areas & Completions Module
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: haccp_cleaning_areas
-- Configurazione aree di pulizia per location
-- =====================================================
CREATE TABLE IF NOT EXISTS public.haccp_cleaning_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  
  -- Area details
  name TEXT NOT NULL,
  description TEXT,
  zone_code TEXT,
  
  -- Scheduling
  cleaning_frequency TEXT NOT NULL CHECK (cleaning_frequency IN ('daily', 'weekly', 'monthly')),
  frequency_times JSONB DEFAULT '[]'::jsonb, -- [{day: 'monday', times: ['08:00', '20:00']}, ...]
  
  -- Checklist
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['Pulire pavimento', 'Sanificare superfici', ...]
  
  -- Assignment
  assigned_role TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT cleaning_area_name_unique UNIQUE (location_id, name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cleaning_areas_location ON public.haccp_cleaning_areas(location_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_areas_org ON public.haccp_cleaning_areas(org_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_areas_active ON public.haccp_cleaning_areas(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER tg_cleaning_areas_updated_at
  BEFORE UPDATE ON public.haccp_cleaning_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =====================================================
-- Table: haccp_cleaning_completions
-- Tracking completamenti pulizie schedulate
-- =====================================================
CREATE TABLE IF NOT EXISTS public.haccp_cleaning_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.haccp_cleaning_areas(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  
  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'overdue')),
  
  -- Checklist responses
  checklist_responses JSONB DEFAULT '{}'::jsonb, -- {item: boolean, ...}
  
  -- Evidence
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_completion_date CHECK (completed_at IS NULL OR completed_at >= scheduled_for)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_area ON public.haccp_cleaning_completions(area_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_location ON public.haccp_cleaning_completions(location_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_scheduled ON public.haccp_cleaning_completions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_cleaning_completions_status ON public.haccp_cleaning_completions(status);

-- =====================================================
-- RLS Policies: haccp_cleaning_areas
-- =====================================================
ALTER TABLE public.haccp_cleaning_areas ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything
CREATE POLICY "Platform admins full access on cleaning_areas"
  ON public.haccp_cleaning_areas
  FOR ALL
  USING (is_platform_admin());

-- Org members can view their org's areas
CREATE POLICY "Org members can view cleaning_areas"
  ON public.haccp_cleaning_areas
  FOR SELECT
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'haccp:view')
  );

-- Org admins and managers can insert/update/delete
CREATE POLICY "Org admins can manage cleaning_areas"
  ON public.haccp_cleaning_areas
  FOR ALL
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- =====================================================
-- RLS Policies: haccp_cleaning_completions
-- =====================================================
ALTER TABLE public.haccp_cleaning_completions ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything
CREATE POLICY "Platform admins full access on cleaning_completions"
  ON public.haccp_cleaning_completions
  FOR ALL
  USING (is_platform_admin());

-- Org members can view completions
CREATE POLICY "Org members can view cleaning_completions"
  ON public.haccp_cleaning_completions
  FOR SELECT
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'haccp:view')
  );

-- Users with haccp:check can insert and update completions
CREATE POLICY "Users can complete cleaning tasks"
  ON public.haccp_cleaning_completions
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'haccp:check')
  );

CREATE POLICY "Users can update cleaning completions"
  ON public.haccp_cleaning_completions
  FOR UPDATE
  USING (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'haccp:check')
  );

-- Admins can delete
CREATE POLICY "Admins can delete cleaning_completions"
  ON public.haccp_cleaning_completions
  FOR DELETE
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'haccp:manage')
  );

-- =====================================================
-- Function: Auto-update status for overdue completions
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_overdue_cleaning_completions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.haccp_cleaning_completions
  SET status = 'overdue'
  WHERE status = 'pending'
    AND scheduled_for < now() - INTERVAL '24 hours'
    AND completed_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_overdue_cleaning_completions() TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.haccp_cleaning_areas IS 'Configurazione aree di pulizia per HACCP compliance';
COMMENT ON TABLE public.haccp_cleaning_completions IS 'Tracking completamenti pulizie schedulate per ogni area';
COMMENT ON COLUMN public.haccp_cleaning_areas.frequency_times IS 'Array di oggetti con giorni e orari: [{day: monday, times: [08:00, 20:00]}]';
COMMENT ON COLUMN public.haccp_cleaning_areas.checklist_items IS 'Array di stringhe con item checklist: [Pulire pavimento, Sanificare]';
COMMENT ON COLUMN public.haccp_cleaning_completions.checklist_responses IS 'Oggetto con risposte checklist: {item1: true, item2: false}';

-- =====================================================
-- Success message
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ HACCP Cleaning module tables created successfully';
  RAISE NOTICE '   - haccp_cleaning_areas';
  RAISE NOTICE '   - haccp_cleaning_completions';
  RAISE NOTICE '   - RLS policies enabled';
  RAISE NOTICE '   - Indexes created';
END $$;