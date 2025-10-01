-- Step 1: Compliance Rules & Violations Schema

-- compliance_rules: definisce i limiti configurabili per org
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL, -- es: 'daily_rest_11h', 'max_hours_per_day_10h', 'max_hours_per_week_48h'
  display_name TEXT NOT NULL,
  description TEXT,
  threshold_value JSONB NOT NULL DEFAULT '{}'::jsonb, -- es: {"hours": 11, "unit": "h"}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, rule_key)
);

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_rules_select 
  ON public.compliance_rules FOR SELECT 
  USING (is_platform_admin() OR user_in_org(org_id));

CREATE POLICY compliance_rules_iud 
  ON public.compliance_rules FOR ALL 
  USING (is_platform_admin() OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage')))
  WITH CHECK (is_platform_admin() OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage')));

-- compliance_violations: registra violazioni (soft warning)
CREATE TABLE IF NOT EXISTS public.compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.compliance_rules(id) ON DELETE CASCADE,
  violation_date DATE NOT NULL, -- giorno violazione
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'critical'
  details JSONB NOT NULL DEFAULT '{}'::jsonb, -- es: {"hours_worked": 12, "threshold": 10}
  is_silenced BOOLEAN NOT NULL DEFAULT false,
  silenced_by UUID,
  silenced_at TIMESTAMPTZ,
  silence_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rule_id, violation_date)
);

ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_violations_select 
  ON public.compliance_violations FOR SELECT 
  USING (
    is_platform_admin() 
    OR user_id = auth.uid() 
    OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
  );

CREATE POLICY compliance_violations_update 
  ON public.compliance_violations FOR UPDATE 
  USING (
    is_platform_admin() 
    OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
  );

CREATE POLICY compliance_violations_insert 
  ON public.compliance_violations FOR INSERT 
  WITH CHECK (user_in_org(org_id));

CREATE POLICY compliance_violations_delete 
  ON public.compliance_violations FOR DELETE 
  USING (is_platform_admin() OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage')));

-- Trigger updated_at
CREATE TRIGGER compliance_rules_updated_at 
  BEFORE UPDATE ON public.compliance_rules 
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed default rules per tutte le org esistenti (FR compliance)
INSERT INTO public.compliance_rules (org_id, rule_key, display_name, description, threshold_value, is_active)
SELECT 
  org_id,
  'daily_rest_11h',
  'Riposo giornaliero 11h',
  'Almeno 11 ore di riposo tra due turni consecutivi (Art. L3131-1)',
  '{"hours": 11}'::jsonb,
  true
FROM public.organizations
ON CONFLICT (org_id, rule_key) DO NOTHING;

INSERT INTO public.compliance_rules (org_id, rule_key, display_name, description, threshold_value, is_active)
SELECT 
  org_id,
  'max_hours_per_day_10h',
  'Max 10h/giorno',
  'Durata massima giornaliera di lavoro effettivo (Art. L3121-18)',
  '{"hours": 10}'::jsonb,
  true
FROM public.organizations
ON CONFLICT (org_id, rule_key) DO NOTHING;

INSERT INTO public.compliance_rules (org_id, rule_key, display_name, description, threshold_value, is_active)
SELECT 
  org_id,
  'max_hours_per_week_48h',
  'Max 48h/settimana',
  'Durata massima settimanale di lavoro (media 12 settimane) (Art. L3121-22)',
  '{"hours": 48}'::jsonb,
  true
FROM public.organizations
ON CONFLICT (org_id, rule_key) DO NOTHING;