-- Sprint 1: Add is_schedulable field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_schedulable BOOLEAN DEFAULT false NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_schedulable 
ON public.profiles(is_schedulable) 
WHERE is_schedulable = true;

-- Add comment
COMMENT ON COLUMN public.profiles.is_schedulable IS 'Indica se l''utente può essere pianificato nei turni del planner';

-- Initialize existing users with active role assignments as schedulable
UPDATE public.profiles
SET is_schedulable = true
WHERE id IN (
  SELECT DISTINCT url.user_id
  FROM public.user_roles_locations url
  WHERE COALESCE(url.is_active, true) = true
);

-- Sprint 2: Create user_contracts table for future contract management
CREATE TABLE IF NOT EXISTS public.user_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_type TEXT NOT NULL DEFAULT 'full_time',
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Working hours configuration
  weekly_hours DECIMAL(5,2) NOT NULL DEFAULT 40.0,
  daily_hours_min DECIMAL(4,2),
  daily_hours_max DECIMAL(4,2),
  
  -- Scheduling constraints
  min_rest_hours DECIMAL(4,2) DEFAULT 11.0,
  max_consecutive_days INTEGER DEFAULT 6,
  max_weekly_hours DECIMAL(5,2),
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_contracts_user_id ON public.user_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contracts_org_id ON public.user_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_user_contracts_location_id ON public.user_contracts(location_id);
CREATE INDEX IF NOT EXISTS idx_user_contracts_active ON public.user_contracts(is_active) WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER tg_user_contracts_updated_at
  BEFORE UPDATE ON public.user_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();

-- Enable RLS
ALTER TABLE public.user_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_contracts
CREATE POLICY "user_contracts_select"
ON public.user_contracts
FOR SELECT
USING (
  is_platform_admin() 
  OR user_id = auth.uid()
  OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage'))
);

CREATE POLICY "user_contracts_insert"
ON public.user_contracts
FOR INSERT
WITH CHECK (
  user_in_org(org_id) 
  AND user_in_location(location_id) 
  AND user_has_permission(auth.uid(), 'users:manage')
);

CREATE POLICY "user_contracts_update"
ON public.user_contracts
FOR UPDATE
USING (
  user_in_org(org_id) 
  AND user_in_location(location_id) 
  AND user_has_permission(auth.uid(), 'users:manage')
);

CREATE POLICY "user_contracts_delete"
ON public.user_contracts
FOR DELETE
USING (
  is_platform_admin()
  OR (user_in_org(org_id) AND user_in_location(location_id) AND user_has_permission(auth.uid(), 'users:manage'))
);

-- Add comments
COMMENT ON TABLE public.user_contracts IS 'Gestione contratti di lavoro degli utenti per vincoli di pianificazione';
COMMENT ON COLUMN public.user_contracts.contract_type IS 'Tipo di contratto: full_time, part_time, seasonal, temporary, etc.';
COMMENT ON COLUMN public.user_contracts.weekly_hours IS 'Ore settimanali previste dal contratto';
COMMENT ON COLUMN public.user_contracts.min_rest_hours IS 'Ore minime di riposo tra turni consecutive (default 11h per normativa UE)';
COMMENT ON COLUMN public.user_contracts.max_consecutive_days IS 'Giorni massimi lavorabili consecutivamente';
COMMENT ON COLUMN public.user_contracts.max_weekly_hours IS 'Limite massimo ore settimanali (per prevenire straordinari eccessivi)';