-- Sprint 2: Shift Templates & Week Duplication
-- Tabella per i template di turni settimanali

CREATE TABLE IF NOT EXISTS public.shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(org_id, location_id, name)
);

-- Tabella per gli item dei template (pattern di turni)
CREATE TABLE IF NOT EXISTS public.shift_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL, -- Ora locale senza timezone
  end_time TIME NOT NULL,
  job_tag_id UUID REFERENCES public.job_tags(id) ON DELETE SET NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_shift_templates_org_location 
  ON public.shift_templates(org_id, location_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shift_template_items_template 
  ON public.shift_template_items(template_id, weekday, start_time);

CREATE INDEX IF NOT EXISTS idx_shift_template_items_org_loc 
  ON public.shift_template_items(org_id, location_id);

-- RLS Policies per shift_templates
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_templates_select_by_org ON public.shift_templates
  FOR SELECT
  USING (is_platform_admin() OR user_in_org(org_id));

CREATE POLICY shift_templates_insert_by_permission ON public.shift_templates
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

CREATE POLICY shift_templates_update_by_permission ON public.shift_templates
  FOR UPDATE
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

CREATE POLICY shift_templates_delete_by_permission ON public.shift_templates
  FOR DELETE
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

-- RLS Policies per shift_template_items
ALTER TABLE public.shift_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY shift_template_items_select ON public.shift_template_items
  FOR SELECT
  USING (
    is_platform_admin() 
    OR user_in_org(org_id)
  );

CREATE POLICY shift_template_items_insert ON public.shift_template_items
  FOR INSERT
  WITH CHECK (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

CREATE POLICY shift_template_items_update ON public.shift_template_items
  FOR UPDATE
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

CREATE POLICY shift_template_items_delete ON public.shift_template_items
  FOR DELETE
  USING (
    user_in_org(org_id) 
    AND user_has_permission(auth.uid(), 'shifts:manage')
  );

-- Trigger per updated_at
CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE public.shift_templates IS 
  'Shift templates for recurring weekly patterns. Used for quick shift creation.';
COMMENT ON TABLE public.shift_template_items IS 
  'Individual shift items within a template, defining time, day, and role assignments.';
COMMENT ON COLUMN public.shift_template_items.weekday IS 
  '0=Monday, 1=Tuesday, ..., 6=Sunday';
COMMENT ON COLUMN public.shift_template_items.start_time IS 
  'Start time in location timezone (time without timezone)';
COMMENT ON COLUMN public.shift_template_items.end_time IS 
  'End time in location timezone (time without timezone)';